from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx

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

AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
CLASSROOM_API_BASE = "https://classroom.googleapis.com/v1"

SCOPES = [
    "https://www.googleapis.com/auth/classroom.courses.readonly",
    "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
    "https://www.googleapis.com/auth/classroom.student-submissions.me.readonly",
    "openid",
    "email",
    "profile",
]


class GoogleClassroomAdapter(BaseOAuthAdapter):
    platform_name = "google_classroom"

    def get_authorization_url(self, state: str) -> str:
        params = {
            "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
            "redirect_uri": settings.GOOGLE_OAUTH_REDIRECT_URI,
            "response_type": "code",
            "scope": " ".join(SCOPES),
            "access_type": "offline",  # required to get a refresh_token
            "prompt": "consent",  # force refresh_token on repeat connections too
            "state": state,
        }
        return f"{AUTHORIZATION_ENDPOINT}?{urlencode(params)}"

    async def exchange_code_for_token(self, code: str) -> TokenBundle:
        data = {
            "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
            "client_secret": settings.GOOGLE_OAUTH_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": settings.GOOGLE_OAUTH_REDIRECT_URI,
        }
        return await self._post_token_request(data)

    async def refresh_access_token(self, refresh_token: str) -> TokenBundle:
        data = {
            "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
            "client_secret": settings.GOOGLE_OAUTH_CLIENT_SECRET,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        }
        bundle = await self._post_token_request(data)
        # Google does not resend refresh_token on refresh calls — keep the old one.
        if not bundle.refresh_token:
            bundle.refresh_token = refresh_token
        return bundle

    async def _post_token_request(self, data: dict) -> TokenBundle:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(TOKEN_ENDPOINT, data=data)

        if response.status_code != 200:
            raise OAuthProviderError(
                f"Google token endpoint returned {response.status_code}: {response.text}"
            )

        payload = response.json()
        expires_in = payload.get("expires_in")
        expires_at = (
            datetime.now(timezone.utc) + timedelta(seconds=expires_in) if expires_in else None
        )

        return TokenBundle(
            access_token=payload["access_token"],
            refresh_token=payload.get("refresh_token"),
            expires_at=expires_at,
            raw=payload,
        )


class GoogleClassroomFetcher(BaseAssignmentFetcher):
    """
    Pulls active courses + non-deleted courseWork from the real Google
    Classroom REST API (https://developers.google.com/classroom/reference/rest).

    NOTE on due dates: Classroom's `dueDate`/`dueTime` fields don't carry an
    explicit timezone in the API response (Classroom associates them with the
    course's Calendar, which isn't exposed here). We treat them as UTC. This
    is a documented simplification — if you need exact local due times,
    a follow-up would call the Calendar API for the course's timezone.
    """

    platform_name = "google_classroom"

    async def fetch_assignments(self, access_token: str) -> list[RemoteCourseWithAssignments]:
        headers = {"Authorization": f"Bearer {access_token}"}
        async with httpx.AsyncClient(timeout=20, headers=headers) as client:
            courses = await self._list_courses(client)
            results: list[RemoteCourseWithAssignments] = []
            for raw_course in courses:
                course = RemoteCourse(external_id=raw_course["id"], name=raw_course.get("name", "Untitled course"))
                coursework = await self._list_coursework(client, course.external_id)
                assignments = []
                for cw in coursework:
                    if cw.get("state") == "DELETED":
                        continue
                    assignments.append(await self._to_remote_assignment(client, course.external_id, cw))
                results.append(RemoteCourseWithAssignments(course=course, assignments=assignments))
            return results

    async def _list_courses(self, client: httpx.AsyncClient) -> list[dict]:
        courses: list[dict] = []
        page_token = None
        while True:
            params = {"courseStates": "ACTIVE", "pageSize": 100}
            if page_token:
                params["pageToken"] = page_token
            response = await client.get(f"{CLASSROOM_API_BASE}/courses", params=params)
            self._raise_for_status(response)
            payload = response.json()
            courses.extend(payload.get("courses", []))
            page_token = payload.get("nextPageToken")
            if not page_token:
                break
        return courses

    async def _list_coursework(self, client: httpx.AsyncClient, course_id: str) -> list[dict]:
        coursework: list[dict] = []
        page_token = None
        while True:
            params = {"pageSize": 100}
            if page_token:
                params["pageToken"] = page_token
            response = await client.get(
                f"{CLASSROOM_API_BASE}/courses/{course_id}/courseWork", params=params
            )
            self._raise_for_status(response)
            payload = response.json()
            coursework.extend(payload.get("courseWork", []))
            page_token = payload.get("nextPageToken")
            if not page_token:
                break
        return coursework

    async def _to_remote_assignment(
        self, client: httpx.AsyncClient, course_id: str, cw: dict
    ) -> RemoteAssignment:
        due_at = self._parse_due(cw.get("dueDate"), cw.get("dueTime"))
        computed_status = await self._computed_status(client, course_id, cw["id"], due_at)

        return RemoteAssignment(
            external_id=cw["id"],
            title=cw.get("title", "Untitled assignment"),
            description=cw.get("description"),
            due_at=due_at,
            source_status=cw.get("state", "UNKNOWN"),
            computed_status=computed_status,
            source_url=cw.get("alternateLink", ""),
        )

    async def _computed_status(
        self, client: httpx.AsyncClient, course_id: str, coursework_id: str, due_at: datetime | None
    ) -> str:
        """Best-effort submission status for the *current* user. Falls back
        to a due-date-only guess if the submissions scope/endpoint isn't
        available (e.g. permission issues on some Workspace domains)."""
        try:
            response = await client.get(
                f"{CLASSROOM_API_BASE}/courses/{course_id}/courseWork/{coursework_id}/studentSubmissions",
                params={"userId": "me", "pageSize": 1},
            )
            if response.status_code == 200:
                submissions = response.json().get("studentSubmissions", [])
                if submissions and submissions[0].get("state") in ("TURNED_IN", "RETURNED"):
                    return "submitted"
        except httpx.HTTPError:
            pass  # fall through to due-date-based guess below

        now = datetime.now(timezone.utc)
        if due_at is not None and due_at < now:
            return "overdue"
        return "not_submitted"

    @staticmethod
    def _parse_due(due_date: dict | None, due_time: dict | None) -> datetime | None:
        if not due_date:
            return None
        hour = (due_time or {}).get("hours", 23)
        minute = (due_time or {}).get("minutes", 59)
        try:
            return datetime(
                year=due_date["year"],
                month=due_date["month"],
                day=due_date["day"],
                hour=hour,
                minute=minute,
                tzinfo=timezone.utc,
            )
        except (KeyError, ValueError):
            return None

    @staticmethod
    def _raise_for_status(response: httpx.Response) -> None:
        if response.status_code == 401:
            raise TokenExpiredError("Google Classroom rejected the access token")
        if response.status_code >= 400:
            raise OAuthProviderError(
                f"Google Classroom API returned {response.status_code}: {response.text}"
            )
