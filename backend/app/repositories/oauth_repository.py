import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.core import OAuthConnection, Platform


class PlatformRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_name(self, name: str) -> Platform | None:
        result = await self.db.execute(select(Platform).where(Platform.name == name))
        return result.scalar_one_or_none()


class OAuthConnectionRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_user_and_platform(
        self, user_id: uuid.UUID, platform_id: int
    ) -> OAuthConnection | None:
        result = await self.db.execute(
            select(OAuthConnection).where(
                OAuthConnection.user_id == user_id,
                OAuthConnection.platform_id == platform_id,
            )
        )
        return result.scalar_one_or_none()

    async def list_for_user(self, user_id: uuid.UUID) -> list[OAuthConnection]:
        result = await self.db.execute(
            select(OAuthConnection)
            .options(selectinload(OAuthConnection.platform))
            .where(OAuthConnection.user_id == user_id)
        )
        return list(result.scalars().all())

    async def get_by_id_with_platform(self, connection_id: uuid.UUID) -> OAuthConnection | None:
        result = await self.db.execute(
            select(OAuthConnection)
            .options(selectinload(OAuthConnection.platform))
            .where(OAuthConnection.id == connection_id)
        )
        return result.scalar_one_or_none()

    async def get_by_user_and_platform_with_platform(
        self, user_id: uuid.UUID, platform_id: int
    ) -> OAuthConnection | None:
        result = await self.db.execute(
            select(OAuthConnection)
            .options(selectinload(OAuthConnection.platform))
            .where(
                OAuthConnection.user_id == user_id,
                OAuthConnection.platform_id == platform_id,
            )
        )
        return result.scalar_one_or_none()

    async def list_all_connected(self) -> list[OAuthConnection]:
        """Every currently-connected connection, across all users — used by
        the periodic Celery sync task."""
        result = await self.db.execute(
            select(OAuthConnection)
            .options(selectinload(OAuthConnection.platform))
            .where(OAuthConnection.status == "connected")
        )
        return list(result.scalars().all())

    async def list_expiring_before(self, cutoff: datetime) -> list[OAuthConnection]:
        """Connected connections whose access token expires before `cutoff`
        — used by the proactive token-refresh Celery task."""
        result = await self.db.execute(
            select(OAuthConnection)
            .options(selectinload(OAuthConnection.platform))
            .where(
                OAuthConnection.status == "connected",
                OAuthConnection.token_expires_at.is_not(None),
                OAuthConnection.token_expires_at <= cutoff,
            )
        )
        return list(result.scalars().all())

    async def upsert(
        self,
        user_id: uuid.UUID,
        platform_id: int,
        access_token_enc: str,
        refresh_token_enc: str | None,
        token_expires_at: datetime | None,
        status: str = "connected",
    ) -> OAuthConnection:
        existing = await self.get_by_user_and_platform(user_id, platform_id)
        if existing:
            existing.access_token_enc = access_token_enc
            existing.refresh_token_enc = refresh_token_enc
            existing.token_expires_at = token_expires_at
            existing.status = status
            await self.db.commit()
            await self.db.refresh(existing)
            return existing

        connection = OAuthConnection(
            user_id=user_id,
            platform_id=platform_id,
            access_token_enc=access_token_enc,
            refresh_token_enc=refresh_token_enc,
            token_expires_at=token_expires_at,
            status=status,
        )
        self.db.add(connection)
        await self.db.commit()
        await self.db.refresh(connection)
        return connection

    async def delete(self, connection: OAuthConnection) -> None:
        await self.db.delete(connection)
        await self.db.commit()
