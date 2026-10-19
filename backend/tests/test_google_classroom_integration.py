from unittest.mock import patch

import httpx
import pytest

from app.integrations.base_fetcher import TokenExpiredError
from app.integrations.google_classroom_adapter import (
    CLASSROOM_API_BASE,
    GoogleClassroomFetcher,
)


@pytest.mark.asyncio
async def test_google_fetcher_loads_coursework_and_student_submission():
    requested = []

    def handler(request: httpx.Request) -> httpx.Response:
        requested.append(request)
        path = request.url.path
        if path == "/v1/courses":
            assert request.url.params["studentId"] == "me"
            return httpx.Response(200, json={"courses": [{"id": "course-1", "name": "Physics"}]})
        if path == "/v1/courses/course-1/courseWork":
            return httpx.Response(200, json={"courseWork": [{
                "id": "work-1", "title": "Lab", "state": "PUBLISHED",
                "alternateLink": "https://classroom.google.com/c/course-1/a/work-1",
            }]})
        if path == "/v1/courses/course-1/courseWork/work-1/studentSubmissions":
            assert request.url.params["userId"] == "me"
            return httpx.Response(200, json={"studentSubmissions": [{"state": "TURNED_IN"}]})
        return httpx.Response(404)

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    with patch("httpx.AsyncClient", return_value=client):
        result = await GoogleClassroomFetcher().fetch_assignments("provider-access-token")

    assert len(result) == 1
    assert result[0].course.external_id == "course-1"
    assignment = result[0].assignments[0]
    assert assignment.external_id == "work-1"
    assert assignment.computed_status == "submitted"
    assert assignment.source_url == "https://classroom.google.com/c/course-1/a/work-1"
    assert len(requested) == 3


@pytest.mark.asyncio
async def test_google_fetcher_follows_course_pagination():
    page_two = f"{CLASSROOM_API_BASE}/courses?pageToken=next"

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/v1/courses" and not request.url.params.get("pageToken"):
            return httpx.Response(200, json={"courses": [{"id": "one", "name": "One"}], "nextPageToken": "next"})
        if str(request.url) == page_two:
            return httpx.Response(200, json={"courses": [{"id": "two", "name": "Two"}]})
        if request.url.path.endswith("/courseWork"):
            return httpx.Response(200, json={"courseWork": []})
        return httpx.Response(404)

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    with patch("httpx.AsyncClient", return_value=client):
        result = await GoogleClassroomFetcher().fetch_assignments("provider-access-token")

    assert [item.course.external_id for item in result] == ["one", "two"]


@pytest.mark.asyncio
async def test_google_fetcher_surfaces_expired_token():
    client = httpx.AsyncClient(transport=httpx.MockTransport(lambda request: httpx.Response(401)))
    with patch("httpx.AsyncClient", return_value=client):
        with pytest.raises(TokenExpiredError):
            await GoogleClassroomFetcher().fetch_assignments("expired-token")


def test_google_classroom_scope_is_read_only():
    from app.integrations.google_classroom_adapter import SCOPES

    assert all(scope.endswith(".readonly") for scope in SCOPES)
