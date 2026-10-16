from datetime import datetime, timezone
import json
from unittest.mock import AsyncMock, patch

import httpx
from jose import jwt
import pytest

from app.core.exceptions import OAuthProviderError
from app.integrations.base_fetcher import TokenExpiredError
from app.integrations.microsoft_teams_adapter import (
    GRAPH_API_BASE,
    MicrosoftTeamsAdapter,
    MicrosoftTeamsFetcher,
)


@pytest.mark.asyncio
async def test_adapter_post_token_request_network_error():
    """Verify that network errors raise OAuthProviderError."""
    adapter = MicrosoftTeamsAdapter()
    with patch("httpx.AsyncClient.post", side_effect=httpx.ConnectError("Network down")):
        with pytest.raises(OAuthProviderError) as exc_info:
            await adapter.exchange_code_for_token("any_code")
        assert "Failed to communicate with Microsoft token endpoint" in str(exc_info.value)


@pytest.mark.asyncio
async def test_adapter_refresh_token_preserves_old_refresh_token_if_absent():
    """Verify that if response lacks refresh_token, old refresh_token is kept."""
    adapter = MicrosoftTeamsAdapter()

    fake_response = httpx.Response(
        200,
        json={
            "access_token": "new_access_token_123",
            "expires_in": 3600,
            # No refresh_token returned by provider
        },
        request=httpx.Request("POST", "https://login.microsoftonline.com/dummy"),
    )

    with patch("httpx.AsyncClient.post", return_value=fake_response):
        bundle = await adapter.refresh_access_token("existing_refresh_token_xyz")
        assert bundle.access_token == "new_access_token_123"
        assert bundle.refresh_token == "existing_refresh_token_xyz"


@pytest.mark.asyncio
async def test_adapter_extracts_id_token_claims():
    """Verify oid, tid, preferred_username extracted into raw."""
    adapter = MicrosoftTeamsAdapter()

    claims = {
        "oid": "user-oid-111",
        "tid": "tenant-tid-222",
        "preferred_username": "student@kmitl.ac.th",
    }
    encoded_id_token = jwt.encode(claims, "dummy_secret", algorithm="HS256")

    fake_response = httpx.Response(
        200,
        json={
            "access_token": "acc_123",
            "refresh_token": "ref_123",
            "expires_in": 3600,
            "id_token": encoded_id_token,
        },
        request=httpx.Request("POST", "https://login.microsoftonline.com/dummy"),
    )

    with patch("httpx.AsyncClient.post", return_value=fake_response):
        bundle = await adapter.exchange_code_for_token("test_code")
        assert bundle.raw.get("oid") == "user-oid-111"
        assert bundle.raw.get("tid") == "tenant-tid-222"
        assert bundle.raw.get("preferred_username") == "student@kmitl.ac.th"


@pytest.mark.asyncio
async def test_fetcher_pagination():
    """Verify pagination support using @odata.nextLink."""
    fetcher = MicrosoftTeamsFetcher()

    page1_url = f"{GRAPH_API_BASE}/education/me/classes"
    page2_url = f"{GRAPH_API_BASE}/education/me/classes?skiptoken=abc"

    def handler(request: httpx.Request) -> httpx.Response:
        url_str = str(request.url)
        if url_str == page1_url:
            return httpx.Response(
                200,
                json={
                    "value": [{"id": "class_1", "displayName": "Class One"}],
                    "@odata.nextLink": page2_url,
                },
            )
        elif url_str == page2_url:
            return httpx.Response(
                200,
                json={
                    "value": [{"id": "class_2", "displayName": "Class Two"}],
                },
            )
        elif "/education/me/assignments" in url_str:
            return httpx.Response(200, json={"value": []})
        return httpx.Response(404)

    transport = httpx.MockTransport(handler)
    with patch("httpx.AsyncClient", return_value=httpx.AsyncClient(transport=transport)):
        courses = await fetcher.fetch_assignments("mock_token")
        assert len(courses) == 2
        assert courses[0].course.external_id == "class_1"
        assert courses[1].course.external_id == "class_2"


@pytest.mark.asyncio
async def test_fetcher_429_retry_after():
    """Verify HTTP 429 respects Retry-After header and retries."""
    fetcher = MicrosoftTeamsFetcher(max_retries=2)
    attempts = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            return httpx.Response(429, headers={"Retry-After": "0.01"})
        return httpx.Response(
            200,
            json={
                "value": [{"id": "c1", "displayName": "Test Class"}],
            },
        )

    transport = httpx.MockTransport(handler)
    with patch("httpx.AsyncClient", return_value=httpx.AsyncClient(transport=transport)):
        with patch("asyncio.sleep", new_callable=AsyncMock) as mock_sleep:
            classes = await fetcher._list_classes(httpx.AsyncClient(transport=transport))
            assert len(classes) == 1
            assert mock_sleep.called
            assert attempts == 2


@pytest.mark.asyncio
async def test_fetcher_401_raises_token_expired_error():
    """Verify HTTP 401 raises TokenExpiredError."""
    fetcher = MicrosoftTeamsFetcher()

    transport = httpx.MockTransport(lambda req: httpx.Response(401, text="Unauthorized token"))
    with patch("httpx.AsyncClient", return_value=httpx.AsyncClient(transport=transport)):
        with pytest.raises(TokenExpiredError):
            await fetcher.fetch_assignments("expired_token")


@pytest.mark.asyncio
async def test_fetcher_403_raises_oauth_provider_error():
    """Verify HTTP 403 raises OAuthProviderError with clear message."""
    fetcher = MicrosoftTeamsFetcher()

    transport = httpx.MockTransport(lambda req: httpx.Response(403, text="Forbidden tenant"))
    with patch("httpx.AsyncClient", return_value=httpx.AsyncClient(transport=transport)):
        with pytest.raises(OAuthProviderError) as exc_info:
            await fetcher.fetch_assignments("forbidden_token")
        assert "admin consent" in str(exc_info.value).lower()


@pytest.mark.asyncio
async def test_fetcher_empty_response():
    """Verify empty classes response returns empty list cleanly."""
    fetcher = MicrosoftTeamsFetcher()

    transport = httpx.MockTransport(lambda req: httpx.Response(200, json={"value": []}))
    with patch("httpx.AsyncClient", return_value=httpx.AsyncClient(transport=transport)):
        results = await fetcher.fetch_assignments("token")
        assert results == []


@pytest.mark.asyncio
async def test_fetcher_assignment_without_due_date():
    """Verify assignment without due date parses due_at as None and computed_status as not_submitted."""
    fetcher = MicrosoftTeamsFetcher()

    def handler(request: httpx.Request) -> httpx.Response:
        url_str = str(request.url)
        if "/education/me/classes" in url_str:
            return httpx.Response(
                200,
                json={"value": [{"id": "c1", "displayName": "Calculus"}]},
            )
        elif "/education/me/assignments" in url_str:
            return httpx.Response(
                200,
                json={
                    "value": [
                        {
                            "id": "asg_no_due",
                            "classId": "c1",
                            "displayName": "Ungraded Survey",
                            "status": "published",
                            "dueDateTime": None,
                        }
                    ]
                },
            )
        elif "/submissions" in url_str:
            return httpx.Response(
                200,
                json={"value": [{"id": "sub_1", "status": "working"}]},
            )
        return httpx.Response(404)

    transport = httpx.MockTransport(handler)
    with patch("httpx.AsyncClient", return_value=httpx.AsyncClient(transport=transport)):
        results = await fetcher.fetch_assignments("token")
        assert len(results) == 1
        asg = results[0].assignments[0]
        assert asg.due_at is None
        assert asg.computed_status == "not_submitted"


@pytest.mark.asyncio
async def test_fetcher_status_mapping_and_no_grades_leaked():
    """
    Test status mappings:
    - submitted -> 'submitted'
    - returned -> 'submitted'
    - working with past due -> 'overdue'
    - working with future due -> 'not_submitted'
    - reassigned with past due -> 'overdue'
    Also verify no grade/points/outcome fields exist in RemoteAssignment.
    """
    fetcher = MicrosoftTeamsFetcher()

    classes_resp = [{"id": "class_test", "displayName": "Physics"}]
    assignments_resp = [
        {
            "id": "asg_sub",
            "classId": "class_test",
            "displayName": "Lab 1",
            "status": "published",
            "dueDateTime": "2026-10-01T12:00:00Z",
            "webUrl": "https://teams.microsoft.com/l/asg_sub",
            # Ensure unexpected grade fields from upstream are ignored
            "points": 100,
            "grade": "A",
        },
        {
            "id": "asg_ret",
            "classId": "class_test",
            "displayName": "Lab 2",
            "status": "published",
            "dueDateTime": "2026-10-02T12:00:00Z",
            "webUrl": "https://teams.microsoft.com/l/asg_ret",
        },
        {
            "id": "asg_overdue",
            "classId": "class_test",
            "displayName": "Lab 3",
            "status": "published",
            "dueDateTime": "2020-01-01T12:00:00Z",  # Past date
            "webUrl": "https://teams.microsoft.com/l/asg_overdue",
        },
        {
            "id": "asg_future",
            "classId": "class_test",
            "displayName": "Lab 4",
            "status": "published",
            "dueDateTime": "2030-01-01T12:00:00Z",  # Future date
            "webUrl": "https://teams.microsoft.com/l/asg_future",
        },
        {
            "id": "asg_reassigned_overdue",
            "classId": "class_test",
            "displayName": "Lab 5",
            "status": "published",
            "dueDateTime": "2020-01-01T12:00:00Z",
            "webUrl": "https://teams.microsoft.com/l/asg_reassigned_overdue",
        },
    ]

    submissions_map = {
        "asg_sub": [{"id": "s1", "status": "submitted", "grade": "100"}],
        "asg_ret": [{"id": "s2", "status": "returned", "feedback": "Great work"}],
        "asg_overdue": [{"id": "s3", "status": "working"}],
        "asg_future": [{"id": "s4", "status": "working"}],
        "asg_reassigned_overdue": [{"id": "s5", "status": "reassigned"}],
    }

    def handler(request: httpx.Request) -> httpx.Response:
        url_str = str(request.url)
        if "/education/me/classes" in url_str:
            return httpx.Response(200, json={"value": classes_resp})
        elif "/education/me/assignments" in url_str:
            return httpx.Response(200, json={"value": assignments_resp})
        elif "/submissions" in url_str:
            for asg_id, subs in submissions_map.items():
                if f"/assignments/{asg_id}/submissions" in url_str:
                    return httpx.Response(200, json={"value": subs})
        return httpx.Response(404)

    transport = httpx.MockTransport(handler)
    with patch("httpx.AsyncClient", return_value=httpx.AsyncClient(transport=transport)):
        results = await fetcher.fetch_assignments("token")

        assert len(results) == 1
        asgs = {a.external_id: a for a in results[0].assignments}

        # Verify computed statuses
        assert asgs["asg_sub"].computed_status == "submitted"
        assert asgs["asg_ret"].computed_status == "submitted"
        assert asgs["asg_overdue"].computed_status == "overdue"
        assert asgs["asg_future"].computed_status == "not_submitted"
        assert asgs["asg_reassigned_overdue"].computed_status == "overdue"

        # Verify no grade/feedback/points leak into RemoteAssignment
        for asg in results[0].assignments:
            asg_dict = asg.__dict__
            assert "grade" not in asg_dict
            assert "points" not in asg_dict
            assert "feedback" not in asg_dict
            assert "outcomes" not in asg_dict
