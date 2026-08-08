from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime


@dataclass
class TokenBundle:
    """Normalized token result, regardless of provider quirks."""

    access_token: str
    refresh_token: str | None
    expires_at: datetime | None
    raw: dict


class BaseOAuthAdapter(ABC):
    """
    Every platform integration (Google Classroom, Microsoft Teams, ...)
    implements this interface. The onboarding flow (oauth_service.py)
    only ever talks to this interface, never to a specific provider,
    so adding a new platform later means adding one new adapter class
    and nothing else.
    """

    #: must match a row in the `platforms` table (Platform.name)
    platform_name: str

    @abstractmethod
    def get_authorization_url(self, state: str) -> str:
        """Build the URL the user's browser is redirected to, to grant consent."""
        raise NotImplementedError

    @abstractmethod
    async def exchange_code_for_token(self, code: str) -> TokenBundle:
        """Exchange the `code` query param received on the callback for tokens."""
        raise NotImplementedError

    @abstractmethod
    async def refresh_access_token(self, refresh_token: str) -> TokenBundle:
        """Use a stored refresh_token to obtain a new access_token."""
        raise NotImplementedError