"""
Celery tasks that actually pull assignment data in from connected
platforms and write it into courses/assignments. Celery workers run in
their own process (not inside FastAPI's event loop), so every task opens
its own short-lived AsyncSession via AsyncSessionLocal and bridges into
async code through worker.async_runner and uses a worker-specific NullPool DB engine.
"""

import uuid

from app.repositories.oauth_repository import OAuthConnectionRepository
from app.repositories.oauth_repository import PlatformRepository
from app.repositories.sync_repository import SyncLogRepository
from app.services.sync_service import SyncService
from app.services.google_classroom_push_service import GoogleClassroomPushService
from worker.celery_app import celery_app
from worker.async_runner import run_async
from worker.database import AsyncSessionLocal


async def _sync_connection_by_id(connection_id: uuid.UUID, sync_log_id: uuid.UUID | None) -> dict:
    async with AsyncSessionLocal() as db:
        connection = await OAuthConnectionRepository(db).get_by_id_with_platform(connection_id)
        if connection is None:
            return {"status": "skipped", "reason": "connection not found"}

        sync_log = await SyncLogRepository(db).get_by_id(sync_log_id) if sync_log_id else None
        result = await SyncService(db).sync_connection(connection, sync_log)
        return {"status": result.status, "items_synced": result.items_synced}


async def _sync_user_platform(user_id: uuid.UUID, platform_name: str) -> dict:
    async with AsyncSessionLocal() as db:
        platform = await PlatformRepository(db).get_by_name(platform_name)
        if platform is None:
            return {"status": "skipped", "reason": f"unknown platform '{platform_name}'"}

        connection = await OAuthConnectionRepository(db).get_by_user_and_platform_with_platform(
            user_id, platform.id
        )
        if connection is None:
            return {"status": "skipped", "reason": "not connected"}

        result = await SyncService(db).sync_connection(connection)
        return {"status": result.status, "items_synced": result.items_synced}


async def _sync_all_connections(platform_name: str | None = None) -> dict:
    async with AsyncSessionLocal() as db:
        connections = await OAuthConnectionRepository(db).list_all_connected()
        total_items = 0
        succeeded = 0
        for connection in connections:
            if platform_name and connection.platform.name != platform_name:
                continue
            result = await SyncService(db).sync_connection(connection)
            if result.status == "success":
                succeeded += 1
                total_items += result.items_synced
        return {
            "connections_checked": sum(
                1 for connection in connections
                if not platform_name or connection.platform.name == platform_name
            ),
            "connections_succeeded": succeeded,
            "items_synced": total_items,
        }


@celery_app.task(name="worker.sync.sync_engine.sync_connection_task", bind=True, max_retries=2)
def sync_connection_task(self, connection_id: str, sync_log_id: str | None = None):
    """Sync a single OAuth connection right now. Used by the manual
    "Sync now" endpoint and provider event handlers."""
    return run_async(
        _sync_connection_by_id(
            uuid.UUID(connection_id),
            uuid.UUID(sync_log_id) if sync_log_id else None,
        )
    )


@celery_app.task(name="worker.sync.sync_engine.sync_user_platform_task")
def sync_user_platform_task(user_id: str, platform_name: str):
    return run_async(_sync_user_platform(uuid.UUID(user_id), platform_name))


@celery_app.task(name="worker.sync.sync_engine.sync_all_connections_task")
def sync_all_connections_task():
    """Manual/legacy full refresh across all connected platform accounts."""
    return run_async(_sync_all_connections())


@celery_app.task(name="worker.sync.sync_engine.sync_microsoft_connections_task")
def sync_microsoft_connections_task():
    """Manual/legacy full refresh for Microsoft Education connections."""
    return run_async(_sync_all_connections("microsoft_teams"))


async def _renew_google_push_registrations() -> dict:
    async with AsyncSessionLocal() as db:
        connections = await OAuthConnectionRepository(db).list_all_connected()
        push_service = GoogleClassroomPushService(db)
        if not push_service.configured:
            return {"enabled": False, "connections_checked": 0, "registrations_renewed": 0}

        checked = 0
        renewed = 0
        failed = 0
        for connection in connections:
            if connection.platform.name != "google_classroom":
                continue
            checked += 1
            try:
                result = await push_service.ensure_registrations(connection)
                renewed += result.get("registered", 0)
            except Exception:  # noqa: BLE001 - one revoked account must not stop other renewals
                failed += 1
        return {
            "enabled": True,
            "connections_checked": checked,
            "registrations_renewed": renewed,
            "failed_connections": failed,
        }


@celery_app.task(name="worker.sync.sync_engine.renew_google_push_registrations_task")
def renew_google_push_registrations_task():
    """Renew Classroom registrations before their one-week expiry."""
    return run_async(_renew_google_push_registrations())
