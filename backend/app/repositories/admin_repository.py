import uuid
from datetime import datetime, time, timedelta, timezone

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.auth import Role, User, UserRole
from app.models.core import OAuthConnection, Platform
from app.models.logs import AuditLog, SyncLog


class AdminUserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def search(self, search: str, page: int, page_size: int = 20) -> tuple[list[User], int]:
        base_where = []
        if search:
            pattern = f"%{search}%"
            base_where.append(or_(User.email.ilike(pattern), User.display_name.ilike(pattern)))

        count_stmt = select(func.count(User.id))
        for cond in base_where:
            count_stmt = count_stmt.where(cond)
        total = int((await self.db.execute(count_stmt)).scalar_one())

        stmt = (
            select(User)
            .options(selectinload(User.user_roles).selectinload(UserRole.role))
            .order_by(User.created_at.desc())
        )
        for cond in base_where:
            stmt = stmt.where(cond)
        stmt = stmt.offset((page - 1) * page_size).limit(page_size)

        result = await self.db.execute(stmt)
        return list(result.scalars().all()), total

    async def get_by_id(self, user_id: uuid.UUID) -> User | None:
        result = await self.db.execute(
            select(User)
            .options(selectinload(User.user_roles).selectinload(UserRole.role))
            .where(User.id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_role_by_name(self, name: str) -> Role | None:
        result = await self.db.execute(select(Role).where(Role.name == name))
        return result.scalar_one_or_none()

    async def replace_role(self, user: User, role: Role) -> None:
        for user_role in list(user.user_roles):
            await self.db.delete(user_role)
        await self.db.flush()
        self.db.add(UserRole(user_id=user.id, role_id=role.id))
        await self.db.commit()
        await self.db.refresh(user, attribute_names=["user_roles"])

    async def set_active(self, user: User, is_active: bool) -> None:
        user.is_active = is_active
        await self.db.commit()
        await self.db.refresh(user)


class AdminConnectionRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_users_with_connections(self) -> list[User]:
        result = await self.db.execute(
            select(User)
            .options(selectinload(User.oauth_connections).selectinload(OAuthConnection.platform))
            .order_by(User.display_name.asc())
        )
        return list(result.scalars().all())

    async def list_platforms(self) -> list[Platform]:
        result = await self.db.execute(select(Platform).order_by(Platform.name.asc()))
        return list(result.scalars().all())

    async def get_by_user_and_platform_name(
        self, user_id: uuid.UUID, platform_name: str
    ) -> OAuthConnection | None:
        result = await self.db.execute(
            select(OAuthConnection)
            .join(Platform)
            .where(OAuthConnection.user_id == user_id, Platform.name == platform_name)
        )
        return result.scalar_one_or_none()

    async def mark_stale(self, connection: OAuthConnection) -> None:
        connection.status = "stale"
        await self.db.commit()
        await self.db.refresh(connection)


class AuditLogRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        actor_user_id: uuid.UUID | None,
        action: str,
        target: str | None = None,
        metadata: dict | None = None,
    ) -> AuditLog:
        log = AuditLog(actor_user_id=actor_user_id, action=action, target=target, metadata_=metadata)
        self.db.add(log)
        await self.db.commit()
        return log

    def _filtered(self, user: str, action: str, date: str):
        stmt = (
            select(AuditLog)
            .options(selectinload(AuditLog.actor))
            .order_by(AuditLog.created_at.desc())
        )
        count_stmt = select(func.count(AuditLog.id))

        if user:
            stmt = stmt.join(User, AuditLog.actor_user_id == User.id, isouter=True)
            count_stmt = count_stmt.join(User, AuditLog.actor_user_id == User.id, isouter=True)
            pattern = f"%{user}%"
            cond = or_(User.email.ilike(pattern), AuditLog.target.ilike(pattern))
            stmt = stmt.where(cond)
            count_stmt = count_stmt.where(cond)

        if action:
            stmt = stmt.where(AuditLog.action == action)
            count_stmt = count_stmt.where(AuditLog.action == action)

        if date:
            try:
                day = datetime.strptime(date, "%Y-%m-%d").date()
            except ValueError:
                day = None
            if day is not None:
                start = datetime.combine(day, time.min, tzinfo=timezone.utc)
                end = start + timedelta(days=1)
                stmt = stmt.where(AuditLog.created_at >= start, AuditLog.created_at < end)
                count_stmt = count_stmt.where(AuditLog.created_at >= start, AuditLog.created_at < end)

        return stmt, count_stmt

    async def search(
        self, user: str, action: str, date: str, page: int, page_size: int = 20
    ) -> tuple[list[AuditLog], int]:
        stmt, count_stmt = self._filtered(user, action, date)
        total = int((await self.db.execute(count_stmt)).scalar_one())
        stmt = stmt.offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(stmt)
        return list(result.scalars().all()), total

    async def search_all(self, user: str, action: str, date: str, limit: int = 10000) -> list[AuditLog]:
        stmt, _ = self._filtered(user, action, date)
        stmt = stmt.limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())


class MonitoringRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def sync_events_in_window(self, minutes: int) -> list[SyncLog]:
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=minutes)
        result = await self.db.execute(
            select(SyncLog).where(
                SyncLog.started_at >= cutoff,
                SyncLog.status.in_(["success", "failed"]),
            )
        )
        return list(result.scalars().all())

    async def queue_depth(self) -> int:
        result = await self.db.execute(
            select(func.count(SyncLog.id)).where(SyncLog.status.in_(["queued", "running"]))
        )
        return int(result.scalar_one())

    async def last_sync_at(self) -> datetime | None:
        result = await self.db.execute(select(func.max(SyncLog.finished_at)))
        return result.scalar_one_or_none()

    async def failure_counts_by_provider(self) -> dict[str, int]:
        result = await self.db.execute(
            select(Platform.name, func.count(SyncLog.id))
            .join(Platform, SyncLog.platform_id == Platform.id)
            .where(SyncLog.status == "failed")
            .group_by(Platform.name)
        )
        return {name: int(count) for name, count in result.all()}

    async def recent_failures(self, limit: int = 20) -> list[SyncLog]:
        result = await self.db.execute(
            select(SyncLog)
            .options(selectinload(SyncLog.user), selectinload(SyncLog.platform))
            .where(SyncLog.status == "failed")
            .order_by(SyncLog.started_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())
