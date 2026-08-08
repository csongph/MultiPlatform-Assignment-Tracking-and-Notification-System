from celery import Celery

from app.core.config import settings
from worker.sync.scheduler import SYNC_BEAT_SCHEDULE

celery_app = Celery(
    "assignment_tracker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    # Celery resolves these task modules lazily by dotted path, so this
    # file never has to import worker.token_refresh or worker.sync.sync_engine
    # directly (avoids a celery_app <-> task-module import cycle, since
    # those modules need `from worker.celery_app import celery_app`).
    include=[
        "worker.sync.sync_engine",
        "worker.token_refresh",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
)

# Periodic jobs. Requires a `celery -A worker.celery_app beat` process
# running alongside the worker (`celery -A worker.celery_app worker`).
celery_app.conf.beat_schedule = {
    **SYNC_BEAT_SCHEDULE,
    "refresh-expiring-tokens": {
        "task": "worker.token_refresh.refresh_expiring_tokens_task",
        "schedule": 300,  # check every 5 minutes regardless of TOKEN_REFRESH_LEAD_MINUTES
    },
}
