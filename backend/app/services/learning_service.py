import uuid
from datetime import datetime

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError, NotFoundError
from app.models.core import Assignment, Course, Notification, NotificationRule, NotificationSettings
from app.models.logs import SyncLog
from app.repositories.learning_repository import LearningRepository
from app.repositories.oauth_repository import OAuthConnectionRepository, PlatformRepository
from app.schemas.learning import (
    AssignmentOut,
    CourseOut,
    DashboardSummary,
    NotificationSettingsUpdate,
    PersonalAssignmentStatusOut,
    PersonalAssignmentStatusUpdate,
    NotificationRuleCreate,
    NotificationRuleUpdate,
    SyncJobOut,
)
from app.services.oauth_service import ensure_supported_platform


class LearningService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.learning = LearningRepository(db)
        self.platforms = PlatformRepository(db)
        self.connections = OAuthConnectionRepository(db)

    async def dashboard_summary(self, user_id: uuid.UUID) -> DashboardSummary:
        total_courses, total_assignments, due_soon, overdue, connected_platforms = (
            await self.learning.dashboard_counts(user_id)
        )
        return DashboardSummary(
            total_courses=total_courses,
            total_assignments=total_assignments,
            due_soon=due_soon,
            overdue=overdue,
            connected_platforms=connected_platforms,
        )

    async def list_courses(
        self, user_id: uuid.UUID, platform: str | None, include_deleted: bool
    ) -> list[CourseOut]:
        if platform:
            ensure_supported_platform(platform)
        courses = await self.learning.list_courses(user_id, platform, include_deleted)
        return [self._course_out(course) for course in courses]

    async def list_assignments(
        self,
        user_id: uuid.UUID,
        status: str | None,
        course_id: uuid.UUID | None,
        due_before: datetime | None,
        include_deleted: bool,
    ) -> list[AssignmentOut]:
        assignments = await self.learning.list_assignments(
            user_id=user_id,
            status=status,
            course_id=course_id,
            due_before=due_before,
            include_deleted=include_deleted,
        )
        statuses = await self.learning.list_user_assignment_statuses(
            user_id, [assignment.id for assignment in assignments]
        )
        return [self._assignment_out(assignment, statuses.get(assignment.id)) for assignment in assignments]

    async def get_assignment(self, user_id: uuid.UUID, assignment_id: uuid.UUID) -> AssignmentOut:
        assignment = await self.learning.get_assignment(user_id, assignment_id)
        if assignment is None:
            raise NotFoundError("Assignment not found")
        statuses = await self.learning.list_user_assignment_statuses(user_id, [assignment.id])
        return self._assignment_out(assignment, statuses.get(assignment.id))

    async def update_personal_assignment_status(
        self, user_id: uuid.UUID, assignment_id: uuid.UUID, payload: PersonalAssignmentStatusUpdate
    ) -> PersonalAssignmentStatusOut:
        row = await self.learning.set_personal_assignment_status(
            user_id, assignment_id, payload.submitted, payload.personal_note
        )
        if row is None:
            raise NotFoundError("Assignment not found")
        return PersonalAssignmentStatusOut(
            assignment_id=row.assignment_id, submitted=row.submitted,
            submitted_at=row.submitted_at, personal_note=row.personal_note,
        )

    async def get_notification_settings(self, user_id: uuid.UUID) -> NotificationSettings:
        return await self.learning.get_notification_settings(user_id)

    async def update_notification_settings(
        self, user_id: uuid.UUID, payload: NotificationSettingsUpdate
    ) -> NotificationSettings:
        # Older frontend clients do not send the newly added JSON field.  Keep
        # their saved intervals instead of accidentally clearing them on PUT.
        current_settings = await self.learning.get_notification_settings(user_id)
        reminder_intervals = (
            payload.reminder_intervals
            if "reminder_intervals" in payload.model_fields_set
            else current_settings.reminder_intervals
        )
        return await self.learning.update_notification_settings(
            user_id=user_id,
            lead_time_minutes=payload.lead_time_minutes,
            new_assignment_enabled=payload.new_assignment_enabled,
            due_soon_enabled=payload.due_soon_enabled,
            overdue_enabled=payload.overdue_enabled,
            channel=payload.channel,
            reminder_intervals=reminder_intervals,
        )

    async def list_notification_rules(self, user_id: uuid.UUID) -> list[NotificationRule]:
        return await self.learning.list_notification_rules(user_id)

    @staticmethod
    def _lead_time_minutes(value: int, unit: str) -> int:
        """Keep a minute value for scheduler arithmetic while the API uses units."""
        return value * {"day": 1440, "hour": 60, "minute": 1}[unit]

    async def create_notification_rule(
        self, user_id: uuid.UUID, payload: NotificationRuleCreate
    ) -> NotificationRule:
        try:
            return await self.learning.create_notification_rule(
                user_id=user_id,
                type_=payload.type,
                lead_time_value=payload.lead_time_value,
                lead_time_unit=payload.lead_time_unit,
                lead_time_minutes=self._lead_time_minutes(payload.lead_time_value, payload.lead_time_unit),
                sequence_order=payload.sequence_order,
                is_enabled=payload.is_enabled,
            )
        except IntegrityError as exc:
            raise ValueError("A notification rule with this type and sequence order already exists") from exc

    async def update_notification_rule(
        self, user_id: uuid.UUID, rule_id: uuid.UUID, payload: NotificationRuleUpdate
    ) -> NotificationRule:
        rule = await self.learning.get_notification_rule(user_id, rule_id)
        if rule is None:
            raise NotFoundError("Notification rule not found")
        try:
            values = {
                "lead_time_value": payload.lead_time_value,
                "lead_time_unit": payload.lead_time_unit,
                "sequence_order": payload.sequence_order,
                "is_enabled": payload.is_enabled,
            }
            if payload.lead_time_value is not None or payload.lead_time_unit is not None:
                value = payload.lead_time_value if payload.lead_time_value is not None else rule.lead_time_value
                unit = payload.lead_time_unit if payload.lead_time_unit is not None else rule.lead_time_unit
                values["lead_time_minutes"] = self._lead_time_minutes(value, unit)
            return await self.learning.update_notification_rule(rule, **values)
        except IntegrityError as exc:
            raise ValueError("A notification rule with this type and sequence order already exists") from exc

    async def delete_notification_rule(self, user_id: uuid.UUID, rule_id: uuid.UUID) -> None:
        rule = await self.learning.get_notification_rule(user_id, rule_id)
        if rule is None:
            raise NotFoundError("Notification rule not found")
        await self.learning.delete_notification_rule(rule)

    async def list_notifications(
        self, user_id: uuid.UUID, status: str | None
    ) -> list[Notification]:
        return await self.learning.list_notifications(user_id, status)

    async def mark_notification_read(
        self, user_id: uuid.UUID, notification_id: uuid.UUID
    ) -> Notification:
        notification = await self.learning.mark_notification_read(user_id, notification_id)
        if notification is None:
            raise NotFoundError("Notification not found")
        return notification

    async def mark_all_notifications_read(self, user_id: uuid.UUID) -> list[Notification]:
        return await self.learning.mark_all_notifications_read(user_id)

    async def queue_sync(
        self, user_id: uuid.UUID, platform_name: str, connection_user_id: uuid.UUID | None = None
    ) -> SyncJobOut:
        ensure_supported_platform(platform_name)
        platform = await self.platforms.get_by_name(platform_name)
        if platform is None:
            raise NotFoundError(
                f"Platform '{platform_name}' has no row in the platforms table. "
                f"Seed it first (see scripts/seed_platforms.py)."
            )

        connection_owner = connection_user_id or user_id
        connection = await self.connections.get_by_user_and_platform(connection_owner, platform.id)
        if connection is None:
            raise NotFoundError(f"'{platform_name}' is not connected yet. Connect it first.")

        sync_log = await self.learning.create_sync_log(connection_owner, platform.id)

        # Import here (not at module scope) to avoid importing Celery/worker
        # code into every FastAPI request - only needed on this code path.
        from worker.sync.sync_engine import sync_connection_task

        try:
            sync_connection_task.delay(str(connection.id), str(sync_log.id))
        except Exception as exc:
            sync_log.status = "failed"
            sync_log.error_detail = {"error": "Sync queue unavailable"}
            sync_log.finished_at = datetime.now().astimezone()
            await self.db.commit()
            raise AppError("Sync queue is unavailable. Please retry later.", 503) from exc

        return self._sync_out(sync_log, platform.name)

    async def get_sync(self, user_id: uuid.UUID, sync_id: uuid.UUID) -> SyncJobOut:
        sync_log = await self.learning.get_sync_log(user_id, sync_id)
        if sync_log is None:
            raise NotFoundError("Sync job not found")
        return self._sync_out(sync_log, sync_log.platform.name)

    @staticmethod
    def _course_out(course: Course) -> CourseOut:
        return CourseOut(
            id=course.id,
            platform=course.platform.name,
            external_course_id=course.external_course_id,
            name=course.name,
            course_code=course.course_code,
            instructor_name=course.instructor_name,
            is_deleted=course.is_deleted,
        )

    @staticmethod
    def _assignment_out(assignment: Assignment, personal_status=None) -> AssignmentOut:
        return AssignmentOut(
            id=assignment.id,
            course_id=assignment.course_id,
            course_name=assignment.course.name,
            platform=assignment.course.platform.name,
            title=assignment.title,
            description=assignment.description,
            due_at=assignment.due_at,
            source_status=assignment.source_status,
            computed_status=assignment.computed_status,
            source_url=assignment.source_url or None,
            is_deleted=assignment.is_deleted,
            last_synced_at=assignment.last_synced_at,
            personal_submitted=bool(personal_status and personal_status.submitted),
            personal_note=personal_status.personal_note if personal_status else None,
        )

    @staticmethod
    def _sync_out(sync_log: SyncLog, platform_name: str) -> SyncJobOut:
        return SyncJobOut(
            job_id=sync_log.id,
            platform=platform_name,
            status=sync_log.status,
            items_synced=sync_log.items_synced,
            error_detail=sync_log.error_detail,
            created_at=sync_log.started_at,
            finished_at=sync_log.finished_at,
        )
