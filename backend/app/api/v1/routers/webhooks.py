"""Provider push notification endpoints."""

import base64
import binascii
import hmac
import ipaddress
import json
import time
from typing import Any

import httpx
import redis.asyncio as redis_asyncio
from fastapi import APIRouter, Depends, HTTPException, Request, status
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models.core import Course, OAuthConnection, Platform

router = APIRouter(prefix="/webhooks", tags=["provider-webhooks"])
_GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs"
_jwks_cache: dict[str, Any] = {"expires_at": 0, "keys": []}


async def _verify_pubsub_identity(authorization: str | None) -> None:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing Pub/Sub OIDC bearer token")
    if not settings.GOOGLE_PUBSUB_PUSH_AUDIENCE or not settings.GOOGLE_PUBSUB_PUSH_SERVICE_ACCOUNT:
        raise HTTPException(status_code=503, detail="Pub/Sub push authentication is not configured")

    token = authorization.split(" ", 1)[1].strip()
    try:
        header = jwt.get_unverified_header(token)
        keys = _jwks_cache["keys"]
        if _jwks_cache["expires_at"] <= time.time():
            async with httpx.AsyncClient(timeout=5) as client:
                response = await client.get(_GOOGLE_JWKS_URL)
                response.raise_for_status()
            keys = response.json().get("keys", [])
            _jwks_cache.update(keys=keys, expires_at=time.time() + 3600)
        signing_key = next((key for key in keys if key.get("kid") == header.get("kid")), None)
        if signing_key is None:
            async with httpx.AsyncClient(timeout=5) as client:
                response = await client.get(_GOOGLE_JWKS_URL)
                response.raise_for_status()
            keys = response.json().get("keys", [])
            _jwks_cache.update(keys=keys, expires_at=time.time() + 3600)
            signing_key = next((key for key in keys if key.get("kid") == header.get("kid")), None)
        if signing_key is None:
            raise JWTError("Google signing key was not found")
        claims = jwt.decode(
            token,
            signing_key,
            algorithms=["RS256"],
            audience=settings.GOOGLE_PUBSUB_PUSH_AUDIENCE,
            options={"verify_iss": False},
        )
    except (JWTError, StopIteration, KeyError, ValueError) as exc:
        raise HTTPException(status_code=401, detail="Invalid Pub/Sub OIDC token") from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail="Could not verify Pub/Sub identity") from exc

    if claims.get("iss") not in {"accounts.google.com", "https://accounts.google.com"}:
        raise HTTPException(status_code=401, detail="Invalid Pub/Sub token issuer")
    if claims.get("email") != settings.GOOGLE_PUBSUB_PUSH_SERVICE_ACCOUNT:
        raise HTTPException(status_code=401, detail="Unexpected Pub/Sub service account")
    if claims.get("email_verified") not in (True, "true"):
        raise HTTPException(status_code=401, detail="Unverified Pub/Sub service account")


async def _authorize_webhook(request: Request) -> str:
    """Use Google OIDC in production; allow controlled local event injection in dev."""
    has_oidc_config = bool(
        settings.GOOGLE_PUBSUB_PUSH_AUDIENCE
        and settings.GOOGLE_PUBSUB_PUSH_SERVICE_ACCOUNT
    )
    if has_oidc_config:
        await _verify_pubsub_identity(request.headers.get("authorization"))
        return "pubsub"

    environment = settings.APP_ENV.strip().lower()
    if environment not in {"development", "dev", "local", "test"}:
        raise HTTPException(status_code=503, detail="Configure Pub/Sub OIDC before enabling production webhooks")

    configured_secret = settings.GOOGLE_CLASSROOM_WEBHOOK_SECRET
    supplied_secret = request.headers.get("x-kmaps-webhook-secret", "")
    if configured_secret:
        if not hmac.compare_digest(supplied_secret, configured_secret):
            raise HTTPException(status_code=401, detail="Invalid local webhook secret")
    else:
        host = request.client.host if request.client else ""
        try:
            is_loopback = ipaddress.ip_address(host).is_loopback
        except ValueError:
            is_loopback = environment == "test" and host == "testclient"
        if not is_loopback:
            raise HTTPException(status_code=401, detail="Local webhook accepts loopback requests only")

    return "local"


@router.post("/google-classroom", status_code=status.HTTP_202_ACCEPTED)
async def google_classroom_push(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Accept a Pub/Sub push event and queue an immediate Classroom refresh."""
    delivery_mode = await _authorize_webhook(request)
    try:
        body = await request.json()
        message = body.get("message") if isinstance(body, dict) else None
        if message is not None:
            event = json.loads(base64.b64decode(message["data"], validate=True))
            message_id = str(message.get("messageId", ""))
        else:
            event = body
            message_id = str(event.get("messageId") or event.get("eventId") or "")
        if not isinstance(event, dict):
            raise ValueError("event must be a JSON object")
        resource_id = event.get("resourceId") or {}
        course_id = str(resource_id.get("courseId") or event.get("courseId") or "")
        if not course_id:
            raise ValueError("courseId is required")
    except (ValueError, TypeError, KeyError, binascii.Error, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=400, detail="Malformed Classroom Pub/Sub event") from exc

    collection = event.get("collection", "courses.courseWork")
    if collection not in {
        "courses.courseWork",
        "courses.courseWork.studentSubmissions",
        "courses.announcements",
    }:
        return {"accepted": True, "queued": 0, "mode": delivery_mode}

    redis = redis_asyncio.from_url(settings.REDIS_URL, socket_connect_timeout=2)
    try:
        if message_id and await redis.get(f"classroom-push:{message_id}"):
            return {"accepted": True, "queued": 0, "duplicate": True, "mode": delivery_mode}
        result = await db.execute(
            select(OAuthConnection.id)
            .join(Platform, Platform.id == OAuthConnection.platform_id)
            .join(Course, Course.user_id == OAuthConnection.user_id)
            .where(
                Platform.name == "google_classroom",
                OAuthConnection.status == "connected",
                Course.external_course_id == course_id,
                Course.is_deleted.is_(False),
            )
            .distinct()
        )
        connection_ids = list(result.scalars().all())
        from worker.sync.sync_engine import sync_connection_task

        for connection_id in connection_ids:
            sync_connection_task.delay(str(connection_id))
        if message_id:
            await redis.set(f"classroom-push:{message_id}", "1", ex=7 * 24 * 60 * 60)
    except Exception as exc:  # return 5xx so Pub/Sub retries if the queue is unavailable
        raise HTTPException(status_code=503, detail="Could not enqueue Classroom event") from exc
    finally:
        await redis.aclose()

    return {"accepted": True, "queued": len(connection_ids), "mode": delivery_mode}


@router.post("/microsoft-teams", status_code=status.HTTP_202_ACCEPTED)
async def microsoft_teams_push(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Accept an event-bridge notification and queue an immediate Teams refresh."""
    configured_secret = settings.MICROSOFT_TEAMS_WEBHOOK_SECRET
    supplied_secret = request.headers.get("x-kmaps-webhook-secret", "")
    if not configured_secret:
        raise HTTPException(status_code=503, detail="Microsoft Teams webhook secret is not configured")
    if not hmac.compare_digest(supplied_secret, configured_secret):
        raise HTTPException(status_code=401, detail="Invalid Microsoft Teams webhook secret")

    try:
        event = await request.json()
        if not isinstance(event, dict):
            raise ValueError("event must be a JSON object")
        connection_id = str(event.get("connectionId") or "")
        event_id = str(event.get("eventId") or "")
        if not connection_id:
            raise ValueError("connectionId is required")
        import uuid
        connection_uuid = uuid.UUID(connection_id)
    except (ValueError, TypeError) as exc:
        raise HTTPException(status_code=400, detail="Malformed Microsoft Teams event") from exc

    redis = redis_asyncio.from_url(settings.REDIS_URL, socket_connect_timeout=2)
    try:
        if event_id and await redis.get(f"microsoft-teams-push:{event_id}"):
            return {"accepted": True, "queued": 0, "duplicate": True}
        result = await db.execute(
            select(OAuthConnection.id)
            .join(Platform, Platform.id == OAuthConnection.platform_id)
            .where(
                OAuthConnection.id == connection_uuid,
                OAuthConnection.status == "connected",
                Platform.name == "microsoft_teams",
            )
        )
        matched_connection_id = result.scalar_one_or_none()
        if matched_connection_id is None:
            raise HTTPException(status_code=404, detail="Connected Microsoft Teams account was not found")
        from worker.sync.sync_engine import sync_connection_task

        sync_connection_task.delay(str(matched_connection_id))
        if event_id:
            await redis.set(f"microsoft-teams-push:{event_id}", "1", ex=7 * 24 * 60 * 60)
    except HTTPException:
        raise
    except Exception as exc:  # return 5xx so the event source can retry delivery
        raise HTTPException(status_code=503, detail="Could not enqueue Microsoft Teams event") from exc
    finally:
        await redis.aclose()

    return {"accepted": True, "queued": 1, "mode": "event-bridge"}
