from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx

from app.core.config import settings
from app.core.exceptions import OAuthProviderError
from app.integrations.base_adapter import BaseOAuthAdapter, TokenBundle

AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"

SCOPES = [
    "https://www.googleapis.com/auth/classroom.courses.readonly",
    "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
    "https://www.googleapis.com/auth/classroom.coursework.students.readonly",
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
