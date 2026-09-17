"""Deliver notification rows using the owner's current preferences."""

import asyncio
from datetime import datetime, timezone

from app.core.database import AsyncSessionLocal
from app.core.config import settings
from app.services.email_service import EmailDeliveryError, send_due_soon_email
from app.repositories.learning_repository import LearningRepository
from worker.celery_app import celery_app


async def _dispatch_pending_notifications() -> int:
    async with AsyncSessionLocal() as db:
        repository = LearningRepository(db)
        now = datetime.now(timezone.utc)
        notifications = await repository.claim_pending_notifications(now, settings.NOTIFICATION_MAX_RETRIES)
        delivered = 0
        for notification in notifications:
            # Re-read settings when dispatching. A user may disable a rule or
            # due-soon notifications after a row was scheduled but before it
            # is sent; that row must not be delivered.
            user_settings = await repository.get_notification_settings(notification.user_id)
            rule = notification.rule
            if not user_settings.due_soon_enabled or rule is None or not rule.is_enabled:
                await repository.mark_notification_cancelled(notification)
                continue

            # The database row is always the user's in-app inbox. Email is an
            # extra delivery channel and is read from that user's live setting.
            if user_settings.channel in ("email", "both"):
                try:
                    assignment = notification.assignment
                    if assignment is None:
                        raise EmailDeliveryError("Notification is missing assignment or rule")
                    await send_due_soon_email(
                        recipient=notification.user.email,
                        assignment_title=assignment.title,
                        course_name=assignment.course.name,
                        due_at=assignment.due_at.isoformat() if assignment.due_at else "No due date",
                        lead_time_minutes=rule.lead_time_minutes,
                    )
                except EmailDeliveryError:
                    await repository.mark_notification_delivery_failed(notification)
                    continue

            await repository.mark_notification_delivered(notification, now)
            delivered += 1
        return delivered


@celery_app.task(name="worker.notification.dispatcher.dispatch_pending_notifications_task")
def dispatch_pending_notifications_task() -> dict:
    return {"delivered": asyncio.run(_dispatch_pending_notifications())}
