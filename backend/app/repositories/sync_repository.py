import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import Assignment, Course
from app.models.logs import SyncLog


class CourseRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get(self, user_id: uuid.UUID, platform_id: int, external_course_id: str) -> Course | None:
        result = await self.db.execute(
            select(Course).where(
                Course.user_id == user_id,
                Course.platform_id == platform_id,
                Course.external_course_id == external_course_id,
            )
        )
        return result.scalar_one_or_none()

    async def upsert(self, user_id: uuid.UUID, platform_id: int, external_course_id: str, name: str) -> Course:
        course = await self.get(user_id, platform_id, external_course_id)
        if course is None:
            course = Course(
                user_id=user_id,
                platform_id=platform_id,
                external_course_id=external_course_id,
                name=name,
            )
            self.db.add(course)
        else:
            course.name = name
            course.is_deleted = False
        await self.db.flush()
        return course

    async def soft_delete_missing(
        self, user_id: uuid.UUID, platform_id: int, seen_external_ids: set[str]
    ) -> None:
        """Any course previously synced for this user+platform that no
        longer showed up in the latest fetch gets marked deleted (not
        removed), so historical assignment data stays intact."""
        result = await self.db.execute(
            select(Course).where(
                Course.user_id == user_id,
                Course.platform_id == platform_id,
                Course.is_deleted.is_(False),
            )
        )
        for course in result.scalars().all():
            if course.external_course_id not in seen_external_ids:
                course.is_deleted = True
        await self.db.flush()


class AssignmentRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get(self, course_id: uuid.UUID, external_assignment_id: str) -> Assignment | None:
        result = await self.db.execute(
            select(Assignment).where(
                Assignment.course_id == course_id,
                Assignment.external_assignment_id == external_assignment_id,
            )
        )
        return result.scalar_one_or_none()

    async def upsert(
        self,
        course_id: uuid.UUID,
        external_assignment_id: str,
        title: str,
        description: str | None,
        due_at: datetime | None,
        source_status: str,
        computed_status: str,
        source_url: str,
    ) -> Assignment:
        assignment = await self.get(course_id, external_assignment_id)
        now = datetime.now(timezone.utc)
        if assignment is None:
            assignment = Assignment(
                course_id=course_id,
                external_assignment_id=external_assignment_id,
                title=title,
                description=description,
                due_at=due_at,
                source_status=source_status,
                computed_status=computed_status,
                source_url=source_url,
                last_synced_at=now,
            )
            self.db.add(assignment)
        else:
            assignment.title = title
            assignment.description = description
            assignment.due_at = due_at
            assignment.source_status = source_status
            assignment.computed_status = computed_status
            assignment.source_url = source_url
            assignment.is_deleted = False
            assignment.last_synced_at = now
        await self.db.flush()
        return assignment

    async def soft_delete_missing(self, course_id: uuid.UUID, seen_external_ids: set[str]) -> None:
        result = await self.db.execute(
            select(Assignment).where(
                Assignment.course_id == course_id,
                Assignment.is_deleted.is_(False),
            )
        )
        for assignment in result.scalars().all():
            if assignment.external_assignment_id not in seen_external_ids:
                assignment.is_deleted = True
        await self.db.flush()


class SyncLogRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, sync_log_id: uuid.UUID) -> SyncLog | None:
        result = await self.db.execute(select(SyncLog).where(SyncLog.id == sync_log_id))
        return result.scalar_one_or_none()

    async def create_running(self, user_id: uuid.UUID, platform_id: int) -> SyncLog:
        sync_log = SyncLog(
            user_id=user_id,
            platform_id=platform_id,
            status="running",
            items_synced=0,
            started_at=datetime.now(timezone.utc),
        )
        self.db.add(sync_log)
        await self.db.commit()
        await self.db.refresh(sync_log)
        return sync_log

    async def mark_running(self, sync_log: SyncLog) -> None:
        sync_log.status = "running"
        sync_log.started_at = datetime.now(timezone.utc)
        await self.db.commit()

    async def mark_finished(
        self,
        sync_log: SyncLog,
        status: str,
        items_synced: int,
        error_detail: dict | None = None,
    ) -> None:
        sync_log.status = status
        sync_log.items_synced = items_synced
        sync_log.error_detail = error_detail
        sync_log.finished_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(sync_log)
