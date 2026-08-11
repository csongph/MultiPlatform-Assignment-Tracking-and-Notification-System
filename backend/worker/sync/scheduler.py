"""
Beat schedule for the periodic full sync. Deliberately has zero
dependency on `worker.celery_app` or `worker.sync.sync_engine` — it's
imported *by* celery_app.py while building the Celery instance, so
importing either of those back here would be a circular import.
Task names are referenced by dotted-path string only; Celery resolves
them lazily via the `include` list in celery_app.py.
"""

from app.core.config import settings

SYNC_BEAT_SCHEDULE = {
    "sync-all-platform-connections": {
        "task": "worker.sync.sync_engine.sync_all_connections_task",
        "schedule": settings.SYNC_INTERVAL_MINUTES * 60,  # seconds
    },
}
