import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import and_, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.core import (
    Assignment,
    Course,
    Notification,
    NotificationRule,
    NotificationSettings,
    OAuthConnection,
    UserAssignmentStatus,
)
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

    async def list_user_assignment_statuses(
        self, user_id: uuid.UUID, assignment_ids: list[uuid.UUID]
    ) -> dict[uuid.UUID, UserAssignmentStatus]:
        if not assignment_ids:
            return {}
        result = await self.db.execute(
            select(UserAssignmentStatus).where(
                UserAssignmentStatus.user_id == user_id,
                UserAssignmentStatus.assignment_id.in_(assignment_ids),
            )
        )
        return {row.assignment_id: row for row in result.scalars().all()}

    async def set_personal_assignment_status(
        self, user_id: uuid.UUID, assignment_id: uuid.UUID, submitted: bool, personal_note: str | None
    ) -> UserAssignmentStatus | None:
        if await self.get_assignment(user_id, assignment_id) is None:
            return None
        result = await self.db.execute(
            select(UserAssignmentStatus).where(
                UserAssignmentStatus.user_id == user_id,
                UserAssignmentStatus.assignment_id == assignment_id,
            )
        )
        row = result.scalar_one_or_none()
        now = datetime.now(timezone.utc)
        if row is None:
            row = UserAssignmentStatus(
                user_id=user_id, assignment_id=assignment_id, submitted=submitted,
                submitted_at=now if submitted else None, personal_note=personal_note,
            )
            self.db.add(row)
        else:
            row.submitted = submitted
            row.submitted_at = now if submitted else None
            row.personal_note = personal_note
        await self.db.commit()
        await self.db.refresh(row)
        return row

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
        reminder_intervals: dict | list | None,
    ) -> NotificationSettings:
        settings = await self.get_notification_settings(user_id)
        settings.lead_time_minutes = lead_time_minutes
        settings.new_assignment_enabled = new_assignment_enabled
        settings.due_soon_enabled = due_soon_enabled
        settings.overdue_enabled = overdue_enabled
        settings.channel = channel
        settings.reminder_intervals = reminder_intervals
        await self.db.commit()
        await self.db.refresh(settings)
        return settings

    async def list_notification_rules(self, user_id: uuid.UUID) -> list[NotificationRule]:
        result = await self.db.execute(
            select(NotificationRule)
            .where(NotificationRule.user_id == user_id)
            .order_by(NotificationRule.type, NotificationRule.sequence_order)
        )
        return list(result.scalars().all())

    async def get_notification_rule(
        self, user_id: uuid.UUID, rule_id: uuid.UUID
    ) -> NotificationRule | None:
        result = await self.db.execute(
            select(NotificationRule).where(
                NotificationRule.id == rule_id, NotificationRule.user_id == user_id
            )
        )
        return result.scalar_one_or_none()

    async def create_notification_rule(
        self,
        user_id: uuid.UUID,
        type_: str,
        lead_time_value: int,
        lead_time_unit: str,
        lead_time_minutes: int,
        sequence_order: int,
        is_enabled: bool,
    ) -> NotificationRule:
        rule = NotificationRule(
            user_id=user_id,
            type=type_,
            lead_time_value=lead_time_value,
            lead_time_unit=lead_time_unit,
            lead_time_minutes=lead_time_minutes,
            sequence_order=sequence_order,
            is_enabled=is_enabled,
        )
        self.db.add(rule)
        try:
            await self.db.commit()
        except IntegrityError:
            await self.db.rollback()
            raise
        await self.db.refresh(rule)
        return rule

    async def update_notification_rule(
        self, rule: NotificationRule, **values: int | bool | str | None
    ) -> NotificationRule:
        for field, value in values.items():
            if value is not None:
                setattr(rule, field, value)
        try:
            await self.db.commit()
        except IntegrityError:
            await self.db.rollback()
            raise
        await self.db.refresh(rule)
        return rule

    async def delete_notification_rule(self, rule: NotificationRule) -> None:
        await self.db.delete(rule)
        await self.db.commit()

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

    async def mark_all_notifications_read(self, user_id: uuid.UUID) -> list[Notification]:
        result = await self.db.execute(
            select(Notification).where(Notification.user_id == user_id, Notification.status != "read")
        )
        notifications = list(result.scalars().all())
        now = datetime.now(timezone.utc)
        for notification in notifications:
            notification.status = "read"
            notification.delivered_at = notification.delivered_at or now
        await self.db.commit()
        return notifications

    async def create_due_notifications(self, now: datetime) -> list[uuid.UUID]:
        """Create due-soon rows once per user/rule/assignment.

        The database unique constraint `(user_id, assignment_id, type, tier)`
        is the final idempotency guard when two Celery workers overlap.
        """
        result = await self.db.execute(
            select(Assignment, Course, NotificationRule)
            .join(Course, Assignment.course_id == Course.id)
            .join(
                NotificationRule,
                and_(
                    NotificationRule.user_id == Course.user_id,
                    NotificationRule.type == "due_soon",
                    NotificationRule.is_enabled.is_(True),
                ),
            )
            .join(
                NotificationSettings,
                and_(
                    NotificationSettings.user_id == Course.user_id,
                    NotificationSettings.due_soon_enabled.is_(True),
                ),
            )
            .outerjoin(
                UserAssignmentStatus,
                and_(
                    UserAssignmentStatus.user_id == Course.user_id,
                    UserAssignmentStatus.assignment_id == Assignment.id,
                ),
            )
            .where(
                Course.is_deleted.is_(False),
                Assignment.is_deleted.is_(False),
                Assignment.due_at.is_not(None),
                Assignment.due_at >= now,
                Assignment.computed_status != "submitted",
                (UserAssignmentStatus.submitted.is_(False) | UserAssignmentStatus.submitted.is_(None)),
                Assignment.due_at <= now + func.make_interval(
                    0, 0, 0, 0, 0, NotificationRule.lead_time_minutes
                ),
            )
        )

        created_ids: list[uuid.UUID] = []
        for assignment, course, rule in result.all():
            notification = Notification(
                user_id=course.user_id,
                assignment_id=assignment.id,
                notification_rule_id=rule.id,
                type="due_soon",
                tier=rule.sequence_order,
                status="pending",
                retry_count=0,
                scheduled_at=assignment.due_at - timedelta(minutes=rule.lead_time_minutes),
            )
            try:
                async with self.db.begin_nested():
                    self.db.add(notification)
                    await self.db.flush()
                    created_ids.append(notification.id)
            except IntegrityError:
                # This notification was already created by an earlier poll.
                continue
        await self.db.commit()
        return created_ids

    async def claim_pending_notifications(self, now: datetime, max_retries: int) -> list[Notification]:
        """Lock pending rows for a dispatcher run without marking them delivered."""
        result = await self.db.execute(
            select(Notification)
            .options(
                selectinload(Notification.user),
                selectinload(Notification.assignment).selectinload(Assignment.course),
                selectinload(Notification.rule),
            )
            .where(
                Notification.status == "pending",
                Notification.scheduled_at <= now,
                Notification.retry_count < max_retries,
            )
            .order_by(Notification.scheduled_at)
            .with_for_update(skip_locked=True)
        )
        return list(result.scalars().all())

    async def mark_notification_delivered(self, notification: Notification, now: datetime) -> None:
        notification.status = "delivered"
        notification.delivered_at = now
        await self.db.commit()

    async def mark_notification_cancelled(self, notification: Notification) -> None:
        """Stop a queued notification whose owner changed their preferences."""
        notification.status = "cancelled"
        await self.db.commit()

    async def mark_notification_delivery_failed(self, notification: Notification) -> None:
        notification.retry_count += 1
        await self.db.commit()

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
