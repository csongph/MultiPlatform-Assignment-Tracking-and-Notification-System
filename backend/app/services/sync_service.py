from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.core.security import decrypt_token, encrypt_token
from app.integrations import get_adapter, get_fetcher
from app.integrations.base_fetcher import BaseAssignmentFetcher, TokenExpiredError
from app.models.core import OAuthConnection
from app.models.logs import SyncLog
from app.repositories.sync_repository import AssignmentRepository, CourseRepository, SyncLogRepository


class SyncService:
    """
    Pulls courses + assignments for one OAuth connection and writes the
    results into the courses/assignments tables. Always leaves behind a
    SyncLog row describing what happened, even on failure, so
    GET /api/v1/sync/{job_id} has something meaningful to show.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.courses = CourseRepository(db)
        self.assignments = AssignmentRepository(db)
        self.sync_logs = SyncLogRepository(db)

    async def sync_connection(self, connection: OAuthConnection, sync_log: SyncLog | None = None) -> SyncLog:
        # `connection.platform` must already be eager-loaded by the caller
        # (see OAuthConnectionRepository.*_with_platform / list_all_connected)
        # — touching a lazy relationship here would blow up with
        # MissingGreenlet on the async engine.
        if sync_log is None:
            sync_log = await self.sync_logs.create_running(connection.user_id, connection.platform_id)
        else:
            await self.sync_logs.mark_running(sync_log)

        try:
            fetcher = get_fetcher(connection.platform.name)
        except NotFoundError as exc:
            await self.sync_logs.mark_finished(
                sync_log, status="skipped", items_synced=0, error_detail={"reason": str(exc)}
            )
            return sync_log

        try:
            results = await self._fetch_with_refresh(connection, fetcher)
        except NotImplementedError as exc:
            await self.sync_logs.mark_finished(
                sync_log, status="skipped", items_synced=0, error_detail={"reason": str(exc)}
            )
            return sync_log
        except Exception as exc:  # noqa: BLE001 - we want to log *any* failure, not crash the worker
            connection.status = "broken"
            await self.db.commit()
            await self.sync_logs.mark_finished(
                sync_log, status="failed", items_synced=0, error_detail={"error": str(exc)}
            )
            return sync_log

        items_synced = 0
        seen_course_ids: set[str] = set()

        for item in results:
            course = await self.courses.upsert(
                user_id=connection.user_id,
                platform_id=connection.platform_id,
                external_course_id=item.course.external_id,
                name=item.course.name,
            )
            seen_course_ids.add(item.course.external_id)

            seen_assignment_ids: set[str] = set()
            for remote_assignment in item.assignments:
                await self.assignments.upsert(
                    course_id=course.id,
                    external_assignment_id=remote_assignment.external_id,
                    title=remote_assignment.title,
                    description=remote_assignment.description,
                    due_at=remote_assignment.due_at,
                    source_status=remote_assignment.source_status,
                    computed_status=remote_assignment.computed_status,
                    source_url=remote_assignment.source_url,
                )
                seen_assignment_ids.add(remote_assignment.external_id)
                items_synced += 1

            await self.assignments.soft_delete_missing(course.id, seen_assignment_ids)

        await self.courses.soft_delete_missing(connection.user_id, connection.platform_id, seen_course_ids)

        if connection.status != "connected":
            connection.status = "connected"
        await self.db.commit()

        await self.sync_logs.mark_finished(sync_log, status="success", items_synced=items_synced)
        return sync_log

    async def _fetch_with_refresh(
        self,
        connection: OAuthConnection,
        fetcher: BaseAssignmentFetcher,
        _retried: bool = False,
    ):
        access_token = decrypt_token(connection.access_token_enc)
        try:
            return await fetcher.fetch_assignments(access_token)
        except TokenExpiredError:
            if _retried or not connection.refresh_token_enc:
                raise
            adapter = get_adapter(connection.platform.name)
            refresh_token = decrypt_token(connection.refresh_token_enc)
            bundle = await adapter.refresh_access_token(refresh_token)

            connection.access_token_enc = encrypt_token(bundle.access_token)
            if bundle.refresh_token:
                connection.refresh_token_enc = encrypt_token(bundle.refresh_token)
            connection.token_expires_at = bundle.expires_at
            await self.db.commit()

            return await self._fetch_with_refresh(connection, fetcher, _retried=True)
