"""
Proactively refreshes OAuth access tokens that are about to expire, so
the periodic sync task (worker/sync/sync_engine.py) never has to do it
inline mid-sync for the common case. Runs on its own beat schedule,
independent of the sync interval (see celery_app.py).
"""

from datetime import datetime, timedelta, timezone
import logging

from app.core.config import settings
from app.core.security import decrypt_token, encrypt_token
from app.core.exceptions import OAuthReauthorizationRequired
from app.integrations import get_adapter
from app.repositories.oauth_repository import OAuthConnectionRepository
from worker.celery_app import celery_app
from worker.async_runner import run_async
from worker.database import AsyncSessionLocal

logger = logging.getLogger(__name__)


async def _refresh_expiring_tokens() -> dict:
    async with AsyncSessionLocal() as db:
        repo = OAuthConnectionRepository(db)
        cutoff = datetime.now(timezone.utc) + timedelta(minutes=settings.TOKEN_REFRESH_LEAD_MINUTES)
        connections = await repo.list_expiring_before(cutoff)

        refreshed = 0
        failed = 0
        reauthorization_required = 0
        for connection in connections:
            if not connection.refresh_token_enc:
                # Without a refresh token, only interactive OAuth can restore access.
                connection.status = "expired"
                reauthorization_required += 1
                continue
            try:
                adapter = get_adapter(connection.platform.name)
                refresh_token = decrypt_token(connection.refresh_token_enc)
                bundle = await adapter.refresh_access_token(refresh_token)

                connection.access_token_enc = encrypt_token(bundle.access_token)
                if bundle.refresh_token:
                    connection.refresh_token_enc = encrypt_token(bundle.refresh_token)
                connection.token_expires_at = bundle.expires_at
                connection.status = "connected"
                refreshed += 1
            except OAuthReauthorizationRequired as exc:
                connection.status = "expired"
                reauthorization_required += 1
                logger.warning(
                    "Platform authorization must be renewed: platform=%s connection_id=%s reason=%s",
                    connection.platform.name,
                    connection.id,
                    exc.message,
                )
            except Exception:  # noqa: BLE001 - one bad connection shouldn't stop the batch
                failed += 1
                # Keep it connected so the next beat run retries transient network,
                # provider, or database-related failures instead of requiring consent.
                logger.exception(
                    "Temporary access-token refresh failure; will retry: platform=%s connection_id=%s",
                    connection.platform.name,
                    connection.id,
                )

        await db.commit()
        return {
            "refreshed": refreshed,
            "failed": failed,
            "reauthorization_required": reauthorization_required,
        }


@celery_app.task(name="worker.token_refresh.refresh_expiring_tokens_task")
def refresh_expiring_tokens_task():
    return run_async(_refresh_expiring_tokens())
