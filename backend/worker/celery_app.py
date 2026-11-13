from celery import Celery

from app.core.config import settings

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
        "worker.notification.scheduler",
        "worker.notification.dispatcher",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    broker_connection_timeout=3,
    broker_transport_options={
        "socket_connect_timeout": 2,
        "socket_timeout": 2,
        "retry_on_timeout": True,
        "health_check_interval": 30,
    },
    task_publish_retry=True,
    task_publish_retry_policy={
        "max_retries": 2,
        "interval_start": 0,
        "interval_step": 0.2,
        "interval_max": 0.5,
    },
)

# Periodic maintenance. Google Classroom changes arrive through Pub/Sub;
# Microsoft Teams changes arrive through the authenticated event-bridge endpoint.
celery_app.conf.beat_schedule = {
    "renew-google-classroom-push-registrations": {
        "task": "worker.sync.sync_engine.renew_google_push_registrations_task",
        "schedule": 6 * 24 * 60 * 60,
    },
    "refresh-expiring-tokens": {
        "task": "worker.token_refresh.refresh_expiring_tokens_task",
        "schedule": 300,  # check every 5 minutes regardless of TOKEN_REFRESH_LEAD_MINUTES
    },
    "schedule-due-notifications": {
        "task": "worker.notification.scheduler.schedule_due_notifications_task",
        "schedule": settings.NOTIFICATION_POLL_INTERVAL_SECONDS,
    },
}
