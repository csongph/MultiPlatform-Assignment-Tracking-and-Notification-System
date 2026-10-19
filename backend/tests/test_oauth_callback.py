import json
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.exceptions import OAuthProviderError
from app.main import app


@pytest.mark.asyncio
async def test_oauth_callback_admin_consent_required_error_param():
    """Verify that error=consent_required redirects to frontend with admin consent notice."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get(
            "/api/v1/oauth/microsoft_teams/callback",
            params={
                "error": "consent_required",
                "error_description": "AADSTS65001: The user or administrator has not consented to use the application.",
                "state": "dummy_state",
            },
            follow_redirects=False,
        )
        assert resp.status_code == 302
        location = resp.headers["location"]
        assert "oauth_error=microsoft_admin_consent_required" in location


@pytest.mark.asyncio
async def test_oauth_callback_admin_consent_aadsts90094():
    """Verify that AADSTS90094 in error_description redirects with admin consent error."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get(
            "/api/v1/oauth/microsoft_teams/callback",
            params={
                "error": "access_denied",
                "error_description": "AADSTS90094: An administrator of the company has not granted the user access.",
                "state": "dummy_state",
            },
            follow_redirects=False,
        )
        assert resp.status_code == 302
        location = resp.headers["location"]
        assert "oauth_error=microsoft_admin_consent_required" in location


@pytest.mark.asyncio
async def test_oauth_callback_access_denied_user_cancelled():
    """Verify normal user cancel returns microsoft_denied."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get(
            "/api/v1/oauth/microsoft_teams/callback",
            params={
                "error": "access_denied",
                "error_description": "The user canceled the consent flow.",
                "state": "dummy_state",
            },
            follow_redirects=False,
        )
        assert resp.status_code == 302
        location = resp.headers["location"]
        assert "oauth_error=microsoft_denied" in location


@pytest.mark.asyncio
async def test_oauth_callback_generic_error():
    """Verify unhandled error returns microsoft_failed."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get(
            "/api/v1/oauth/microsoft_teams/callback",
            params={
                "error": "server_error",
                "error_description": "Internal error",
                "state": "dummy_state",
            },
            follow_redirects=False,
        )
        assert resp.status_code == 302
        location = resp.headers["location"]
        assert "oauth_error=microsoft_failed" in location


@pytest.mark.asyncio
async def test_oauth_callback_token_exchange_admin_consent_exception():
    """Verify that if exchange_code_for_token fails with AADSTS65001, admin consent redirect occurs."""
    with patch(
        "app.services.oauth_service.OAuthOnboardingService.handle_callback",
        new_callable=AsyncMock,
    ) as mock_handle:
        mock_handle.side_effect = OAuthProviderError(
            "Microsoft token endpoint returned 400: AADSTS65001: The user or administrator has not consented..."
        )
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get(
                "/api/v1/oauth/microsoft_teams/callback",
                params={"code": "valid_code", "state": "valid_state"},
                follow_redirects=False,
            )
            assert resp.status_code == 302
            location = resp.headers["location"]
            assert "oauth_error=microsoft_admin_consent_required" in location
