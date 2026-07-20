import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.core import Assignment, Course, Notification, NotificationSettings, OAuthConnection
from app.models.logs import SyncLog


class LearningRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def dashboard_counts(self, user_id: uuid.UUID) -> tuple[int, int, int, int, list[str]]:
        now = datetime.now(timezone.utc)
        due_soon_until = now + timedelta(hours=24)

        total_courses = await self._count(
            select(func.count(Course.id)).where(Course.user_id == user_id, Course.is_deleted.is_(False))
        )
        total_assignments = await self._count(
            select(func.count(Assignment.id))
            .join(Course)
            .where(Course.user_id == user_id, Assignment.is_deleted.is_(False))
        )
        due_soon = await self._count(
            select(func.count(Assignment.id))
            .join(Course)
            .where(
                Course.user_id == user_id,
                Assignment.is_deleted.is_(False),
                Assignment.due_at.is_not(None),
                Assignment.due_at >= now,
                Assignment.due_at <= due_soon_until,
            )
        )
        overdue = await self._count(
            select(func.count(Assignment.id))
            .join(Course)
            .where(
                Course.user_id == user_id,
                Assignment.is_deleted.is_(False),
                Assignment.computed_status == "overdue",
            )
        )

        platform_result = await self.db.execute(
            select(OAuthConnection)
            .options(selectinload(OAuthConnection.platform))
            .where(OAuthConnection.user_id == user_id, OAuthConnection.status == "connected")
        )
        connected_platforms = [connection.platform.name for connection in platform_result.scalars().all()]
        return total_courses, total_assignments, due_soon, overdue, connected_platforms

    async def list_courses(
        self, user_id: uuid.UUID, platform: str | None = None, include_deleted: bool = False
    ) -> list[Course]:
        statement = (
            select(Course)
            .options(selectinload(Course.platform))
            .where(Course.user_id == user_id)
            .order_by(Course.name.asc())
        )
        if platform:
            statement = statement.where(Course.platform.has(name=platform))
        if not include_deleted:
            statement = statement.where(Course.is_deleted.is_(False))

        result = await self.db.execute(statement)
        return list(result.scalars().all())

    async def list_assignments(
        self,
        user_id: uuid.UUID,
        status: str | None = None,
        course_id: uuid.UUID | None = None,
        due_before: datetime | None = None,
        include_deleted: bool = False,
    ) -> list[Assignment]:
        statement = (
            select(Assignment)
            .join(Course)
            .options(selectinload(Assignment.course).selectinload(Course.platform))
            .where(Course.user_id == user_id)
            .order_by(Assignment.due_at.asc().nulls_last(), Assignment.title.asc())
        )
        if status:
            statement = statement.where(Assignment.computed_status == status)
        if course_id:
            statement = statement.where(Assignment.course_id == course_id)
        if due_before:
            statement = statement.where(Assignment.due_at <= due_before)
        if not include_deleted:
            statement = statement.where(Assignment.is_deleted.is_(False))

        result = await self.db.execute(statement)
        return list(result.scalars().all())

    async def get_assignment(self, user_id: uuid.UUID, assignment_id: uuid.UUID) -> Assignment | None:
        result = await self.db.execute(
            select(Assignment)
            .join(Course)
            .options(selectinload(Assignment.course).selectinload(Course.platform))
            .where(Course.user_id == user_id, Assignment.id == assignment_id)
        )
        return result.scalar_one_or_none()

    async def get_notification_settings(self, user_id: uuid.UUID) -> NotificationSettings:
        result = await self.db.execute(
            select(NotificationSettings).where(NotificationSettings.user_id == user_id)
        )
        settings = result.scalar_one_or_none()
        if settings is None:
            settings = NotificationSettings(user_id=user_id)
            self.db.add(settings)
            await self.db.commit()
            await self.db.refresh(settings)
        return settings

    async def update_notification_settings(
        self,
        user_id: uuid.UUID,
        lead_time_minutes: int,
        new_assignment_enabled: bool,
        due_soon_enabled: bool,
        overdue_enabled: bool,
        channel: str,
    ) -> NotificationSettings:
        settings = await self.get_notification_settings(user_id)
        settings.lead_time_minutes = lead_time_minutes
        settings.new_assignment_enabled = new_assignment_enabled
        settings.due_soon_enabled = due_soon_enabled
        settings.overdue_enabled = overdue_enabled
        settings.channel = channel
        await self.db.commit()
        await self.db.refresh(settings)
        return settings

    async def list_notifications(self, user_id: uuid.UUID, status: str | None = None) -> list[Notification]:
        statement = (
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.scheduled_at.desc())
        )
        if status:
            statement = statement.where(Notification.status == status)
        result = await self.db.execute(statement)
        return list(result.scalars().all())

    async def mark_notification_read(
        self, user_id: uuid.UUID, notification_id: uuid.UUID
    ) -> Notification | None:
        result = await self.db.execute(
            select(Notification).where(Notification.user_id == user_id, Notification.id == notification_id)
        )
        notification = result.scalar_one_or_none()
        if notification is None:
            return None

        notification.status = "read"
        if notification.delivered_at is None:
            notification.delivered_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(notification)
        return notification

    async def create_sync_log(self, user_id: uuid.UUID, platform_id: int) -> SyncLog:
        sync_log = SyncLog(
            user_id=user_id,
            platform_id=platform_id,
            status="queued",
            items_synced=0,
            started_at=datetime.now(timezone.utc),
        )
        self.db.add(sync_log)
        await self.db.commit()
        await self.db.refresh(sync_log)
        return sync_log

    async def get_sync_log(self, user_id: uuid.UUID, sync_id: uuid.UUID) -> SyncLog | None:
        result = await self.db.execute(
            select(SyncLog)
            .options(selectinload(SyncLog.platform))
            .where(SyncLog.user_id == user_id, SyncLog.id == sync_id)
        )
        return result.scalar_one_or_none()

    async def _count(self, statement) -> int:
        result = await self.db.execute(statement)
        return int(result.scalar_one())
