import asyncio
import json
from datetime import datetime, timedelta, timezone
import html
import logging
from pathlib import Path
import re
from urllib.parse import urlencode

import httpx

from app.core.config import settings
from app.core.exceptions import OAuthProviderError, OAuthReauthorizationRequired
from app.integrations.base_adapter import BaseOAuthAdapter, TokenBundle
from app.integrations.base_fetcher import (
    BaseAssignmentFetcher,
    RemoteAssignment,
    RemoteAnnouncement,
    RemoteCourse,
    RemoteCourseWithAnnouncements,
    RemoteCourseWithAssignments,
    TokenExpiredError,
)

logger = logging.getLogger(__name__)

GRAPH_API_BASE = "https://graph.microsoft.com/v1.0"

SCOPES = [
    "offline_access",
    "https://graph.microsoft.com/EduAssignments.ReadBasic",
    "https://graph.microsoft.com/EduRoster.ReadBasic",
    "https://graph.microsoft.com/ChannelMessage.Read.All",
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
            # Do not silently reuse a Microsoft account cached by the browser;
            # users may have separate personal and school/work accounts.
            "prompt": "select_account",
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
                "Failed to communicate with Microsoft token endpoint"
            ) from exc

        if response.status_code != 200:
            try:
                provider_error = response.json().get("error")
            except (ValueError, AttributeError):
                provider_error = None
            if provider_error in {"invalid_grant", "interaction_required"}:
                raise OAuthReauthorizationRequired(
                    "Microsoft refresh token was revoked or requires new consent"
                )
            raise OAuthProviderError(
                f"Microsoft token endpoint returned {response.status_code}"
            )

        payload = response.json()
        if not isinstance(payload, dict) or not payload.get("access_token"):
            raise OAuthProviderError("Microsoft token endpoint response did not contain an access token")
        expires_in = payload.get("expires_in")
        expires_at = (
            datetime.now(timezone.utc) + timedelta(seconds=expires_in) if expires_in else None
        )

        return TokenBundle(
            access_token=payload["access_token"],
            refresh_token=payload.get("refresh_token"),
            expires_at=expires_at,
            raw={},
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
        if settings.MICROSOFT_TEAMS_USE_MOCK_DATA:
            if settings.APP_ENV.strip().lower() == "production":
                raise OAuthProviderError("Microsoft Teams mock data is disabled in production")
            return await self._fetch_mock_assignments()

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

            async def load_class(cls: dict) -> RemoteCourseWithAssignments | None:
                class_id = cls.get("id")
                if not class_id:
                    return None
                class_name = cls.get("displayName") or "Untitled Class"
                course = RemoteCourse(external_id=class_id, name=class_name)
                class_raw_assignments = assignments_by_class.get(class_id, [])
                assignments_for_course = await self._process_assignments_for_class(
                    client=client,
                    class_id=class_id,
                    raw_assignments=class_raw_assignments,
                )
                return RemoteCourseWithAssignments(course=course, assignments=assignments_for_course)

            loaded = await asyncio.gather(*(load_class(cls) for cls in classes))
            return [item for item in loaded if item is not None]

    async def fetch_announcements(self, access_token: str) -> list[RemoteCourseWithAnnouncements]:
        """Read channel posts for education classes; requires ChannelMessage.Read.All consent."""
        if settings.MICROSOFT_TEAMS_USE_MOCK_DATA:
            path = Path(settings.MICROSOFT_TEAMS_MOCK_DATA_PATH)
            if not path.is_absolute():
                path = Path(__file__).resolve().parents[2] / path
            payload = json.loads(path.read_text(encoding="utf-8"))
            courses = payload.get("announcements", {}).get("value", [])
            return [RemoteCourseWithAnnouncements(
                str(course.get("classId")),
                [RemoteAnnouncement(
                    external_id=str(item["id"]),
                    title=item["subject"],
                    content=self._clean_html((item.get("body") or {}).get("content", "")) or None,
                    published_at=self._parse_iso_datetime(item.get("createdDateTime")),
                    source_url=item.get("webUrl"),
                    author_role="teacher",
                ) for item in course.get("messages", [])
                    if item.get("id") and item.get("subject")
                    and ((item.get("from") or {}).get("user") or {}).get("id") in course.get("teacherIds", [])]
            ) for course in courses if course.get("classId")]

        headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/json"}
        results: list[RemoteCourseWithAnnouncements] = []
        async with httpx.AsyncClient(timeout=25, headers=headers) as client:
            classes = await self._list_classes(client)
            for cls in classes:
                class_id = cls.get("id")
                if not class_id:
                    continue
                messages: list[RemoteAnnouncement] = []
                try:
                    teachers = await self._fetch_paged_items(
                        client, f"{GRAPH_API_BASE}/education/classes/{class_id}/teachers"
                    )
                    teacher_ids = {
                        str(teacher.get("id") or teacher.get("userId"))
                        for teacher in teachers if teacher.get("id") or teacher.get("userId")
                    }
                    channels = await self._fetch_paged_items(client, f"{GRAPH_API_BASE}/teams/{class_id}/channels")
                    for channel in channels:
                        channel_id = channel.get("id")
                        if not channel_id:
                            continue
                        rows = await self._fetch_paged_items(
                            client, f"{GRAPH_API_BASE}/teams/{class_id}/channels/{channel_id}/messages",
                            params={"$top": "50"},
                        )
                        for row in rows:
                            if not row.get("id") or row.get("deletedDateTime"):
                                continue
                            author_id = str(((row.get("from") or {}).get("user") or {}).get("id") or "")
                            subject = (row.get("subject") or "").strip()
                            # A Teams announcement is a titled channel post authored by a class teacher.
                            # Regular chat, student posts, and work/coursework are intentionally excluded.
                            if author_id not in teacher_ids or not subject:
                                continue
                            body = row.get("body") or {}
                            messages.append(RemoteAnnouncement(
                                external_id=f"{channel_id}:{row['id']}",
                                title=subject,
                                content=self._clean_html(body.get("content", "")) or None,
                                published_at=self._parse_iso_datetime(row.get("createdDateTime")),
                                source_url=row.get("webUrl"),
                                author_role="teacher",
                            ))
                except OAuthProviderError:
                    # Bubble up so sync can preserve existing announcements instead of soft-deleting them.
                    raise
                results.append(RemoteCourseWithAnnouncements(class_id, messages))
        return results

    async def _fetch_mock_assignments(self) -> list[RemoteCourseWithAssignments]:
        """Load a Graph-shaped fixture for local demos without Microsoft credentials."""
        path = Path(settings.MICROSOFT_TEAMS_MOCK_DATA_PATH)
        if not path.is_absolute():
            path = Path(__file__).resolve().parents[2] / path
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise OAuthProviderError(f"Could not load Microsoft Teams mock data: {path}") from exc

        if not isinstance(payload, dict):
            raise OAuthProviderError("Microsoft Teams mock data must be a JSON object")
        classes = payload.get("classes", {}).get("value", [])
        assignments = payload.get("assignments", {}).get("value", [])
        if not isinstance(classes, list) or not isinstance(assignments, list):
            raise OAuthProviderError("Microsoft Teams mock data must contain classes.value and assignments.value arrays")

        grouped: dict[str, list[dict]] = {}
        for item in assignments:
            if isinstance(item, dict) and item.get("classId"):
                grouped.setdefault(item["classId"], []).append(item)

        now = datetime.now(timezone.utc)
        results = []
        for raw_class in classes:
            if not isinstance(raw_class, dict) or not raw_class.get("id"):
                continue
            course = RemoteCourse(raw_class["id"], raw_class.get("displayName") or "Untitled Class")
            remote_assignments = []
            for raw in grouped.get(course.external_id, []):
                if not raw.get("id") or raw.get("status") in ("draft", "deactivated"):
                    continue
                due_at = self._parse_iso_datetime(raw.get("dueDateTime"))
                submissions = self._expanded_submissions(raw) or []
                submitted = bool(submissions and (submissions[0].get("status") or "").lower() in ("submitted", "returned"))
                instructions = raw.get("instructions")
                description = self._clean_html(instructions["content"]) if isinstance(instructions, dict) and instructions.get("content") else None
                remote_assignments.append(RemoteAssignment(
                    external_id=raw["id"],
                    title=raw.get("displayName") or "Untitled assignment",
                    description=description,
                    due_at=due_at,
                    source_status=raw.get("status", "unknown"),
                    computed_status="submitted" if submitted else "overdue" if due_at and due_at < now else "not_submitted",
                    source_url=raw.get("webUrl"),
                ))
            results.append(RemoteCourseWithAssignments(course, remote_assignments))
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
                try:
                    response = await client.get(url, params=params)
                except httpx.RequestError as exc:
                    if attempt >= self.max_retries:
                        raise OAuthProviderError("Microsoft Graph network request failed after retries") from exc
                    await asyncio.sleep(min(60, 2 ** attempt))
                    continue

            if response.status_code == 429 or response.status_code >= 500:
                if attempt >= self.max_retries:
                    self._raise_for_status(response)

                retry_after_header = response.headers.get("Retry-After")
                try:
                    retry_seconds = float(retry_after_header) if retry_after_header else (2 ** attempt)
                except (ValueError, TypeError):
                    retry_seconds = 2 ** attempt

                # Safety cap for sleep duration in retry
                sleep_time = min(max(retry_seconds, 1.0), 60.0)
                reason = "rate limit" if response.status_code == 429 else "server error"
                logger.warning(
                    "Graph API %s; waiting %s seconds before retry %d/%d",
                    reason,
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
        """Fetch assignments and their submissions together to avoid N+1 calls."""
        return await self._fetch_paged_items(
            client,
            f"{GRAPH_API_BASE}/education/me/assignments",
            params={"$expand": "submissions"},
        )

    async def _process_assignments_for_class(
        self,
        client: httpx.AsyncClient,
        class_id: str,
        raw_assignments: list[dict],
    ) -> list[RemoteAssignment]:
        """Processes assignments for a class and calculates submission status."""
        async def limited(raw_asg: dict) -> RemoteAssignment:
            # _get_with_retry applies the shared semaphore to each actual HTTP
            # request. Acquiring it here as well deadlocks when concurrent
            # assignment tasks hold every permit while waiting for submissions.
            return await self._to_remote_assignment(client, class_id, raw_asg)

        tasks = [limited(raw_asg) for raw_asg in raw_assignments
                 if raw_asg.get("status") not in ("draft", "deactivated")]
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

        # Graph may omit webUrl; preserve null rather than constructing an
        # undocumented Teams deep link.
        web_url = raw_asg.get("webUrl")

        # Fetch submission status for the current user
        computed_status = await self._compute_submission_status(
            client=client,
            class_id=class_id,
            assignment_id=assignment_id,
            due_at=due_at,
            submissions=self._expanded_submissions(raw_asg),
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
        submissions: list[dict] | None = None,
    ) -> str:
        """
        Fetches submissions for this assignment and maps to standard computed status:
        submitted / not_submitted / overdue.
        """
        now = datetime.now(timezone.utc)
        url = f"{GRAPH_API_BASE}/education/classes/{class_id}/assignments/{assignment_id}/submissions"

        try:
            # Graph supports expanding submissions on an assignment collection.
            # Keep the per-assignment endpoint as a compatibility fallback only
            # when the provider omitted the expanded relation entirely.
            if submissions is None:
                submissions = await self._fetch_paged_items(client, url)
            if submissions:
                # In delegated student permissions, this list only includes the student's submission.
                sub_status = (submissions[0].get("status") or "").lower()
                if sub_status in ("submitted", "returned"):
                    return "submitted"
        except (TokenExpiredError, OAuthProviderError):
            raise

        if due_at is not None and due_at < now:
            return "overdue"
        return "not_submitted"

    @staticmethod
    def _expanded_submissions(raw_assignment: dict) -> list[dict] | None:
        """Normalize the expanded collection while distinguishing missing from empty."""
        if "submissions" not in raw_assignment:
            return None
        value = raw_assignment.get("submissions")
        if isinstance(value, list):
            return value
        if isinstance(value, dict):
            items = value.get("value")
            return items if isinstance(items, list) else []
        return []

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
                "Microsoft Graph forbidden (403): admin consent or Education access may be required."
            )
        if response.status_code >= 400:
            raise OAuthProviderError(
                f"Microsoft Graph API returned {response.status_code}"
            )
