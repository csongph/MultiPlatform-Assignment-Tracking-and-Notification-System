import asyncio
from datetime import datetime, timedelta, timezone
import html
import logging
import re
from urllib.parse import urlencode

import httpx
from jose import JWTError, jwt

from app.core.config import settings
from app.core.exceptions import OAuthProviderError
from app.integrations.base_adapter import BaseOAuthAdapter, TokenBundle
from app.integrations.base_fetcher import (
    BaseAssignmentFetcher,
    RemoteAssignment,
    RemoteCourse,
    RemoteCourseWithAssignments,
    TokenExpiredError,
)

logger = logging.getLogger(__name__)

GRAPH_API_BASE = "https://graph.microsoft.com/v1.0"

SCOPES = [
    "offline_access",
    "openid",
    "email",
    "profile",
    "https://graph.microsoft.com/User.Read",
    "https://graph.microsoft.com/EduAssignments.ReadBasic",
    "https://graph.microsoft.com/EduAssignments.Read",
    "https://graph.microsoft.com/Team.ReadBasic.All",
    "https://graph.microsoft.com/EduRoster.Read",
]


def _authorization_endpoint() -> str:
    return f"https://login.microsoftonline.com/{settings.MICROSOFT_OAUTH_TENANT}/oauth2/v2.0/authorize"


def _token_endpoint() -> str:
    return f"https://login.microsoftonline.com/{settings.MICROSOFT_OAUTH_TENANT}/oauth2/v2.0/token"


class MicrosoftTeamsAdapter(BaseOAuthAdapter):
    platform_name = "microsoft_teams"

    def get_authorization_url(self, state: str) -> str:
        params = {
            "client_id": settings.MICROSOFT_OAUTH_CLIENT_ID,
            "redirect_uri": settings.MICROSOFT_OAUTH_REDIRECT_URI,
            "response_type": "code",
            "response_mode": "query",
            "scope": " ".join(SCOPES),
            "state": state,
        }
        return f"{_authorization_endpoint()}?{urlencode(params)}"

    async def exchange_code_for_token(self, code: str) -> TokenBundle:
        data = {
            "client_id": settings.MICROSOFT_OAUTH_CLIENT_ID,
            "client_secret": settings.MICROSOFT_OAUTH_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": settings.MICROSOFT_OAUTH_REDIRECT_URI,
            "scope": " ".join(SCOPES),
        }
        return await self._post_token_request(data)

    async def refresh_access_token(self, refresh_token: str) -> TokenBundle:
        data = {
            "client_id": settings.MICROSOFT_OAUTH_CLIENT_ID,
            "client_secret": settings.MICROSOFT_OAUTH_CLIENT_SECRET,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
            "scope": " ".join(SCOPES),
        }
        bundle = await self._post_token_request(data)
        # If response does not contain a new refresh_token, preserve the previous one.
        if not bundle.refresh_token:
            bundle.refresh_token = refresh_token
        return bundle

    async def _post_token_request(self, data: dict) -> TokenBundle:
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                response = await client.post(_token_endpoint(), data=data)
        except httpx.RequestError as exc:
            raise OAuthProviderError(
                f"Failed to communicate with Microsoft token endpoint: {exc}"
            ) from exc

        if response.status_code != 200:
            raise OAuthProviderError(
                f"Microsoft token endpoint returned {response.status_code}: {response.text}"
            )

        payload = response.json()
        expires_in = payload.get("expires_in")
        expires_at = (
            datetime.now(timezone.utc) + timedelta(seconds=expires_in) if expires_in else None
        )

        # Extract user & tenant identifiers from id_token without signature verification
        # (token received directly from Microsoft token endpoint over TLS).
        raw_data = dict(payload)
        id_token = payload.get("id_token")
        if id_token:
            try:
                id_token_claims = jwt.get_unverified_claims(id_token)
                if isinstance(id_token_claims, dict):
                    raw_data["oid"] = id_token_claims.get("oid")
                    raw_data["tid"] = id_token_claims.get("tid")
                    raw_data["preferred_username"] = id_token_claims.get("preferred_username")
            except (JWTError, Exception) as exc:
                logger.warning("Could not extract unverified claims from id_token: %s", exc)

        return TokenBundle(
            access_token=payload["access_token"],
            refresh_token=payload.get("refresh_token"),
            expires_at=expires_at,
            raw=raw_data,
        )


class MicrosoftTeamsFetcher(BaseAssignmentFetcher):
    """
    Fetches courses and assignments for Microsoft Teams / Education using Microsoft Graph v1.0.

    SUBMISSION STATUS MAPPING TABLE:
    +---------------------------------+----------------------+-----------------------------------------------+
    | Microsoft Graph Submission      | KMAPS computed_status| Condition / Description                       |
    | (status)                        |                      |                                               |
    +---------------------------------+----------------------+-----------------------------------------------+
    | 'submitted'                     | 'submitted'          | Student turned in coursework                  |
    | 'returned'                      | 'submitted'          | Teacher reviewed coursework                   |
    | 'working'                       | 'not_submitted'      | Student is drafting; deadline not passed      |
    | 'working'                       | 'overdue'            | Student is drafting; deadline has passed      |
    | 'reassigned'                    | 'not_submitted'      | Sent back for revisions; deadline not passed  |
    | 'reassigned'                    | 'overdue'            | Sent back for revisions; deadline has passed  |
    | (no submission / other)         | 'not_submitted'      | No submission record; deadline not passed     |
    | (no submission / other)         | 'overdue'            | No submission record; deadline has passed     |
    +---------------------------------+----------------------+-----------------------------------------------+

    NOTE ON PRIVACY AND GRADES:
    - This fetcher NEVER extracts, stores, or logs grades, max points, outcomes, or feedback.
    - Only submission completion status and deadlines are processed.
    """

    platform_name = "microsoft_teams"

    def __init__(self, max_concurrency: int = 5, max_retries: int = 3):
        self.semaphore = asyncio.Semaphore(max_concurrency)
        self.max_retries = max_retries

    async def fetch_assignments(self, access_token: str) -> list[RemoteCourseWithAssignments]:
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
        }

        async with httpx.AsyncClient(timeout=25, headers=headers) as client:
            # 1. Fetch user classes
            classes = await self._list_classes(client)
            if not classes:
                return []

            # 2. Fetch assignments across all classes in one batch from /education/me/assignments
            # Group assignments by classId to minimize redundant class coursework calls.
            all_assignments = await self._list_user_assignments(client)
            assignments_by_class: dict[str, list[dict]] = {}
            for item in all_assignments:
                cid = item.get("classId")
                if cid:
                    assignments_by_class.setdefault(cid, []).append(item)

            # 3. Process each class and its assignments concurrently with semaphore
            results: list[RemoteCourseWithAssignments] = []

            for cls in classes:
                class_id = cls.get("id")
                class_name = cls.get("displayName") or "Untitled Class"
                course = RemoteCourse(external_id=class_id, name=class_name)

                class_raw_assignments = assignments_by_class.get(class_id, [])

                # Process assignments for this class
                assignments_for_course = await self._process_assignments_for_class(
                    client=client,
                    class_id=class_id,
                    raw_assignments=class_raw_assignments,
                )
                results.append(
                    RemoteCourseWithAssignments(
                        course=course,
                        assignments=assignments_for_course,
                    )
                )

            return results

    async def _get_with_retry(
        self,
        client: httpx.AsyncClient,
        url: str,
        params: dict | None = None,
    ) -> httpx.Response:
        """GET request with HTTP 429 Retry-After handling up to self.max_retries times."""
        for attempt in range(self.max_retries + 1):
            async with self.semaphore:
                response = await client.get(url, params=params)

            if response.status_code == 429:
                if attempt >= self.max_retries:
                    self._raise_for_status(response)

                retry_after_header = response.headers.get("Retry-After")
                try:
                    retry_seconds = float(retry_after_header) if retry_after_header else (2 ** attempt)
                except (ValueError, TypeError):
                    retry_seconds = 2 ** attempt

                # Safety cap for sleep duration in retry
                sleep_time = min(max(retry_seconds, 1.0), 60.0)
                logger.warning(
                    "Hit HTTP 429 on %s, waiting %s seconds before retry %d/%d",
                    url,
                    sleep_time,
                    attempt + 1,
                    self.max_retries,
                )
                await asyncio.sleep(sleep_time)
                continue

            self._raise_for_status(response)
            return response

        # Fallback if loop ends unexpectedly
        self._raise_for_status(response)
        return response

    async def _fetch_paged_items(
        self,
        client: httpx.AsyncClient,
        url: str,
        params: dict | None = None,
    ) -> list[dict]:
        """Follows @odata.nextLink pagination to retrieve all items."""
        items: list[dict] = []
        next_url: str | None = url
        current_params = params

        while next_url:
            response = await self._get_with_retry(client, next_url, params=current_params)
            payload = response.json()
            val = payload.get("value", [])
            if isinstance(val, list):
                items.extend(val)
            # Once nextLink is provided, query parameters are already part of nextLink
            next_url = payload.get("@odata.nextLink")
            current_params = None

        return items

    async def _list_classes(self, client: httpx.AsyncClient) -> list[dict]:
        """Fetch all classes for the current student/user via /education/me/classes."""
        return await self._fetch_paged_items(client, f"{GRAPH_API_BASE}/education/me/classes")

    async def _list_user_assignments(self, client: httpx.AsyncClient) -> list[dict]:
        """Fetch all assignments for the user in a single aggregated call."""
        return await self._fetch_paged_items(client, f"{GRAPH_API_BASE}/education/me/assignments")

    async def _process_assignments_for_class(
        self,
        client: httpx.AsyncClient,
        class_id: str,
        raw_assignments: list[dict],
    ) -> list[RemoteAssignment]:
        """Processes assignments for a class and calculates submission status."""
        tasks = [
            self._to_remote_assignment(client, class_id, raw_asg)
            for raw_asg in raw_assignments
            if raw_asg.get("status") != "draft" and raw_asg.get("status") != "deactivated"
        ]
        if not tasks:
            return []
        return await asyncio.gather(*tasks)

    async def _to_remote_assignment(
        self,
        client: httpx.AsyncClient,
        class_id: str,
        raw_asg: dict,
    ) -> RemoteAssignment:
        assignment_id = raw_asg["id"]
        title = raw_asg.get("displayName") or "Untitled assignment"
        due_at = self._parse_iso_datetime(raw_asg.get("dueDateTime"))

        # Instructions / description:
        # Note: /education/me/assignments does not populate instructions/webUrl.
        # Check raw instructions if present.
        instructions_obj = raw_asg.get("instructions")
        description = None
        if isinstance(instructions_obj, dict):
            raw_content = instructions_obj.get("content")
            if raw_content:
                description = self._clean_html(raw_content)

        # Web URL: fallback to Teams deep-link format if null
        web_url = raw_asg.get("webUrl") or f"https://teams.microsoft.com/l/entity/classroom/{class_id}?assignmentId={assignment_id}"

        # Fetch submission status for the current user
        computed_status = await self._compute_submission_status(
            client=client,
            class_id=class_id,
            assignment_id=assignment_id,
            due_at=due_at,
        )

        return RemoteAssignment(
            external_id=assignment_id,
            title=title,
            description=description,
            due_at=due_at,
            source_status=raw_asg.get("status", "unknown"),
            computed_status=computed_status,
            source_url=web_url,
        )

    async def _compute_submission_status(
        self,
        client: httpx.AsyncClient,
        class_id: str,
        assignment_id: str,
        due_at: datetime | None,
    ) -> str:
        """
        Fetches submissions for this assignment and maps to standard computed status:
        submitted / not_submitted / overdue.
        """
        now = datetime.now(timezone.utc)
        url = f"{GRAPH_API_BASE}/education/classes/{class_id}/assignments/{assignment_id}/submissions"

        try:
            submissions = await self._fetch_paged_items(client, url)
            if submissions:
                # In delegated student permissions, this list only includes the student's submission.
                sub_status = (submissions[0].get("status") or "").lower()
                if sub_status in ("submitted", "returned"):
                    return "submitted"
        except (TokenExpiredError, OAuthProviderError):
            # Let TokenExpiredError and permissions errors propagate
            raise
        except Exception as exc:
            # Fall through to due date comparison on unexpected transient submission fetch error
            logger.warning("Could not fetch submission for assignment %s: %s", assignment_id, exc)

        if due_at is not None and due_at < now:
            return "overdue"
        return "not_submitted"

    @staticmethod
    def _parse_iso_datetime(iso_str: str | None) -> datetime | None:
        if not iso_str:
            return None
        try:
            # Handles 'Z' or '+00:00'
            clean_str = iso_str.replace("Z", "+00:00")
            dt = datetime.fromisoformat(clean_str)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc)
        except (ValueError, TypeError):
            return None

    @staticmethod
    def _clean_html(raw_html: str) -> str:
        text = re.sub(r"<[^>]+>", "", raw_html)
        return html.unescape(text).strip()

    @staticmethod
    def _raise_for_status(response: httpx.Response) -> None:
        if response.status_code == 401:
            raise TokenExpiredError("Microsoft Graph rejected the access token (401)")
        if response.status_code == 403:
            raise OAuthProviderError(
                f"Microsoft Graph forbidden (403): Tenant requires admin consent or Education is disabled. Detail: {response.text}"
            )
        if response.status_code >= 400:
            raise OAuthProviderError(
                f"Microsoft Graph API returned {response.status_code}: {response.text}"
            )
