"""
Celery tasks that actually pull assignment data in from connected
platforms and write it into courses/assignments. Celery workers run in
their own process (not inside FastAPI's event loop), so every task opens
its own short-lived AsyncSession via AsyncSessionLocal and bridges into
async code with asyncio.run().
"""

import asyncio
import uuid

from app.core.database import AsyncSessionLocal
from app.repositories.oauth_repository import OAuthConnectionRepository
from app.repositories.oauth_repository import PlatformRepository
from app.repositories.sync_repository import SyncLogRepository
from app.services.sync_service import SyncService
from worker.celery_app import celery_app


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


async def _sync_all_connections() -> dict:
    async with AsyncSessionLocal() as db:
        connections = await OAuthConnectionRepository(db).list_all_connected()
        total_items = 0
        succeeded = 0
        for connection in connections:
            result = await SyncService(db).sync_connection(connection)
            if result.status == "success":
                succeeded += 1
                total_items += result.items_synced
        return {
            "connections_checked": len(connections),
            "connections_succeeded": succeeded,
            "items_synced": total_items,
        }


@celery_app.task(name="worker.sync.sync_engine.sync_connection_task", bind=True, max_retries=2)
def sync_connection_task(self, connection_id: str, sync_log_id: str | None = None):
    """Sync a single OAuth connection right now. Used by the manual
    "Sync now" endpoint (POST /api/v1/sync) so the user doesn't have to
    wait for the next periodic beat run."""
    return asyncio.run(
        _sync_connection_by_id(
            uuid.UUID(connection_id),
            uuid.UUID(sync_log_id) if sync_log_id else None,
        )
    )


@celery_app.task(name="worker.sync.sync_engine.sync_user_platform_task")
def sync_user_platform_task(user_id: str, platform_name: str):
    return asyncio.run(_sync_user_platform(uuid.UUID(user_id), platform_name))


@celery_app.task(name="worker.sync.sync_engine.sync_all_connections_task")
def sync_all_connections_task():
    """Periodic job (see worker/sync/scheduler.py) — walks every connected
    OAuth connection across all users and re-syncs it."""
    return asyncio.run(_sync_all_connections())
