"""Periodic evaluation of due-soon notification rules."""

import asyncio
from datetime import datetime, timezone

from app.core.database import AsyncSessionLocal
from app.repositories.learning_repository import LearningRepository
from worker.celery_app import celery_app


async def _schedule_due_notifications() -> int:
    async with AsyncSessionLocal() as db:
        return len(await LearningRepository(db).create_due_notifications(datetime.now(timezone.utc)))


@celery_app.task(name="worker.notification.scheduler.schedule_due_notifications_task")
def schedule_due_notifications_task() -> dict:
    created = asyncio.run(_schedule_due_notifications())
    # Dispatch separately so that the scheduling pass stays idempotent and
    # future email/push providers do not slow down rule evaluation.
    # Always dispatch: this also retries pending Gmail deliveries from a
    # previous polling round even when this round creates no new rows.
    from worker.notification.dispatcher import dispatch_pending_notifications_task

    dispatch_pending_notifications_task.delay()
    return {"created": created}
