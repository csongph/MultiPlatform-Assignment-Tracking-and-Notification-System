from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx

from app.core.config import settings
from app.core.exceptions import OAuthProviderError
from app.integrations.base_adapter import BaseOAuthAdapter, TokenBundle

SCOPES = [
    "offline_access",
    "openid",
    "email",
    "profile",
    "https://graph.microsoft.com/User.Read",
    "https://graph.microsoft.com/EduAssignments.ReadBasic",
    "https://graph.microsoft.com/Team.ReadBasic.All",
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
        return await self._post_token_request(data)

    async def _post_token_request(self, data: dict) -> TokenBundle:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(_token_endpoint(), data=data)

        if response.status_code != 200:
            raise OAuthProviderError(
                f"Microsoft token endpoint returned {response.status_code}: {response.text}"
            )

        payload = response.json()
        expires_in = payload.get("expires_in")
        expires_at = (
            datetime.now(timezone.utc) + timedelta(seconds=expires_in) if expires_in else None
        )

        return TokenBundle(
            access_token=payload["access_token"],
            # Microsoft always resends a refresh_token when offline_access is granted
            refresh_token=payload.get("refresh_token"),
            expires_at=expires_at,
            raw=payload,
        )
