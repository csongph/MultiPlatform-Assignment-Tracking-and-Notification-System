"""
Proactively refreshes OAuth access tokens that are about to expire, so
the periodic sync task (worker/sync/sync_engine.py) never has to do it
inline mid-sync for the common case. Runs on its own beat schedule,
independent of the sync interval (see celery_app.py).
"""

import asyncio
from datetime import datetime, timedelta, timezone

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.security import decrypt_token, encrypt_token
from app.integrations import get_adapter
from app.repositories.oauth_repository import OAuthConnectionRepository
from worker.celery_app import celery_app


async def _refresh_expiring_tokens() -> dict:
    async with AsyncSessionLocal() as db:
        repo = OAuthConnectionRepository(db)
        cutoff = datetime.now(timezone.utc) + timedelta(minutes=settings.TOKEN_REFRESH_LEAD_MINUTES)
        connections = await repo.list_expiring_before(cutoff)

        refreshed = 0
        failed = 0
        for connection in connections:
            if not connection.refresh_token_enc:
                # No refresh token on file (shouldn't normally happen once
                # connected) — nothing we can do proactively; the next
                # sync attempt will surface this as a "broken" connection.
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
            except Exception:  # noqa: BLE001 - one bad connection shouldn't stop the batch
                connection.status = "expired"
                failed += 1

        await db.commit()
        return {"refreshed": refreshed, "failed": failed}


@celery_app.task(name="worker.token_refresh.refresh_expiring_tokens_task")
def refresh_expiring_tokens_task():
    return asyncio.run(_refresh_expiring_tokens())
