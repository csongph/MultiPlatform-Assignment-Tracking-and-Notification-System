import uuid

from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError, UnauthorizedError
from app.core.security import create_oauth_state_token, decode_oauth_state_token, encrypt_token
from app.integrations import SUPPORTED_PLATFORMS, get_adapter
from app.models.core import OAuthConnection
from app.repositories.admin_repository import AuditLogRepository
from app.repositories.oauth_repository import OAuthConnectionRepository, PlatformRepository
from app.repositories.user_repository import UserRepository


class OAuthOnboardingService:
    """
    Drives the two-step onboarding flow for connecting a third-party
    platform (Google Classroom, Microsoft Teams, ...) to a user's account:

      1. build_authorization_url(): user clicks "Connect" -> we redirect
         them to the provider's consent screen.
      2. handle_callback(): provider redirects back with a `code` -> we
         exchange it for tokens, encrypt them, and upsert oauth_connections.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.connections = OAuthConnectionRepository(db)
        self.platforms = PlatformRepository(db)

    def build_authorization_url(self, user_id: uuid.UUID, platform_name: str) -> str:
        adapter = get_adapter(platform_name)  # raises NotFoundError if unknown
        state = create_oauth_state_token(user_id, platform_name)
        return adapter.get_authorization_url(state=state)

    async def handle_callback(self, platform_name: str, code: str, state: str) -> OAuthConnection:
        user_id, state_platform = self._verify_state(state)

        if state_platform != platform_name:
            raise UnauthorizedError("OAuth state does not match the callback platform")

        platform = await self.platforms.get_by_name(platform_name)
        if platform is None:
            raise NotFoundError(
                f"Platform '{platform_name}' has no row in the platforms table. "
                f"Seed it first (see scripts/seed_platforms.py)."
            )

        adapter = get_adapter(platform_name)
        token_bundle = await adapter.exchange_code_for_token(code)

        access_token_enc = encrypt_token(token_bundle.access_token)
        refresh_token_enc = encrypt_token(token_bundle.refresh_token) if token_bundle.refresh_token else None

        connection = await self.connections.upsert(
            user_id=user_id,
            platform_id=platform.id,
            access_token_enc=access_token_enc,
            refresh_token_enc=refresh_token_enc,
            token_expires_at=token_bundle.expires_at,
            status="connected",
        )

        # Feeds the Admin Console's Audit Log tab (M14).
        user = await UserRepository(self.db).get_by_id(user_id)
        await AuditLogRepository(self.db).create(
            actor_user_id=user_id,
            action="connect_platform",
            target=user.email if user else str(user_id),
            metadata={"platform": platform_name},
        )

        return connection

    async def list_connections(self, user_id: uuid.UUID) -> list[OAuthConnection]:
        return await self.connections.list_for_user(user_id)

    async def disconnect(self, user_id: uuid.UUID, platform_name: str) -> None:
        platform = await self.platforms.get_by_name(platform_name)
        if platform is None:
            raise NotFoundError(f"Unknown platform '{platform_name}'")

        connection = await self.connections.get_by_user_and_platform(user_id, platform.id)
        if connection is None:
            raise NotFoundError("No active connection found for this platform")

        await self.connections.delete(connection)

        # Feeds the Admin Console's Audit Log tab (M14).
        user = await UserRepository(self.db).get_by_id(user_id)
        await AuditLogRepository(self.db).create(
            actor_user_id=user_id,
            action="disconnect_platform",
            target=user.email if user else str(user_id),
            metadata={"platform": platform_name},
        )

    @staticmethod
    def _verify_state(state: str) -> tuple[uuid.UUID, str]:
        try:
            payload = decode_oauth_state_token(state)
        except JWTError as exc:
            raise UnauthorizedError("Invalid or expired OAuth state token") from exc

        return uuid.UUID(payload["sub"]), payload["platform"]


def ensure_supported_platform(platform_name: str) -> None:
    if platform_name not in SUPPORTED_PLATFORMS:
        raise NotFoundError(
            f"Unknown platform '{platform_name}'. Supported: {', '.join(SUPPORTED_PLATFORMS)}"
        )
