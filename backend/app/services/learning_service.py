import uuid
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.core import Assignment, Course, Notification, NotificationSettings
from app.models.logs import SyncLog
from app.repositories.learning_repository import LearningRepository
from app.repositories.oauth_repository import OAuthConnectionRepository, PlatformRepository
from app.schemas.learning import (
    AssignmentOut,
    CourseOut,
    DashboardSummary,
    NotificationSettingsUpdate,
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
        return [self._assignment_out(assignment) for assignment in assignments]

    async def get_assignment(self, user_id: uuid.UUID, assignment_id: uuid.UUID) -> AssignmentOut:
        assignment = await self.learning.get_assignment(user_id, assignment_id)
        if assignment is None:
            raise NotFoundError("Assignment not found")
        return self._assignment_out(assignment)

    async def get_notification_settings(self, user_id: uuid.UUID) -> NotificationSettings:
        return await self.learning.get_notification_settings(user_id)

    async def update_notification_settings(
        self, user_id: uuid.UUID, payload: NotificationSettingsUpdate
    ) -> NotificationSettings:
        return await self.learning.update_notification_settings(
            user_id=user_id,
            lead_time_minutes=payload.lead_time_minutes,
            new_assignment_enabled=payload.new_assignment_enabled,
            due_soon_enabled=payload.due_soon_enabled,
            overdue_enabled=payload.overdue_enabled,
            channel=payload.channel,
        )

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

    async def queue_sync(self, user_id: uuid.UUID, platform_name: str) -> SyncJobOut:
        ensure_supported_platform(platform_name)
        platform = await self.platforms.get_by_name(platform_name)
        if platform is None:
            raise NotFoundError(
                f"Platform '{platform_name}' has no row in the platforms table. "
                f"Seed it first (see scripts/seed_platforms.py)."
            )

        connection = await self.connections.get_by_user_and_platform(user_id, platform.id)
        if connection is None:
            raise NotFoundError(f"'{platform_name}' is not connected yet. Connect it first.")

        sync_log = await self.learning.create_sync_log(user_id, platform.id)

        # Import here (not at module scope) to avoid importing Celery/worker
        # code into every FastAPI request - only needed on this code path.
        from worker.sync.sync_engine import sync_connection_task

        sync_connection_task.delay(str(connection.id), str(sync_log.id))

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
            is_deleted=course.is_deleted,
        )

    @staticmethod
    def _assignment_out(assignment: Assignment) -> AssignmentOut:
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
            source_url=assignment.source_url,
            is_deleted=assignment.is_deleted,
            last_synced_at=assignment.last_synced_at,
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
