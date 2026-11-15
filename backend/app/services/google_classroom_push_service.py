"""Create and renew Google Classroom course-work push registrations."""

import logging
from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import decrypt_token, encrypt_token
from app.integrations.google_classroom_adapter import CLASSROOM_REGISTRATIONS_URL, GoogleClassroomAdapter
from app.models.core import Course, OAuthConnection

logger = logging.getLogger(__name__)


class GoogleClassroomPushService:
    def __init__(self, db: AsyncSession):
        self.db = db

    @property
    def configured(self) -> bool:
        return all((
            settings.GOOGLE_CLASSROOM_PUBSUB_TOPIC,
            settings.GOOGLE_PUBSUB_PUSH_AUDIENCE,
            settings.GOOGLE_PUBSUB_PUSH_SERVICE_ACCOUNT,
        ))

    async def ensure_registrations(
        self, connection: OAuthConnection, course_ids: list[str] | None = None
    ) -> dict:
        if not self.configured:
            return {"enabled": False, "registered": 0}

        if course_ids is None:
            result = await self.db.execute(
                select(Course.external_course_id).where(
                    Course.user_id == connection.user_id,
                    Course.platform_id == connection.platform_id,
                    Course.is_deleted.is_(False),
                )
            )
            course_ids = list(result.scalars().all())

        if not course_ids:
            return {"enabled": True, "registered": 0}

        token = await self._fresh_access_token(connection)
        registered = 0
        async with httpx.AsyncClient(timeout=20) as client:
            for course_id in course_ids:
                response = await client.post(
                    CLASSROOM_REGISTRATIONS_URL,
                    headers={"Authorization": f"Bearer {token}"},
                    json={
                        "feed": {
                            "feedType": "COURSE_WORK_CHANGES",
                            "courseId": course_id,
                        },
                        "cloudPubSubTopic": settings.GOOGLE_CLASSROOM_PUBSUB_TOPIC,
                    },
                )
                if response.status_code == 401:
                    token = await self._refresh_access_token(connection)
                    response = await client.post(
                        CLASSROOM_REGISTRATIONS_URL,
                        headers={"Authorization": f"Bearer {token}"},
                        json={
                            "feed": {
                                "feedType": "COURSE_WORK_CHANGES",
                                "courseId": course_id,
                            },
                            "cloudPubSubTopic": settings.GOOGLE_CLASSROOM_PUBSUB_TOPIC,
                        },
                    )
                if response.status_code not in (200, 201):
                    raise RuntimeError(
                        f"Classroom registration failed for course {course_id} "
                        f"with HTTP {response.status_code}: {response.text[:400]}"
                    )
                registered += 1

        return {"enabled": True, "registered": registered}

    async def _fresh_access_token(self, connection: OAuthConnection) -> str:
        token = decrypt_token(connection.access_token_enc)
        expires_at = connection.token_expires_at
        if expires_at and expires_at <= datetime.now(timezone.utc) + timedelta(minutes=2):
            return await self._refresh_access_token(connection)
        return token

    async def _refresh_access_token(self, connection: OAuthConnection) -> str:
        if not connection.refresh_token_enc:
            raise RuntimeError("Google Classroom connection has no refresh token")
        bundle = await GoogleClassroomAdapter().refresh_access_token(
            decrypt_token(connection.refresh_token_enc)
        )
        connection.access_token_enc = encrypt_token(bundle.access_token)
        if bundle.refresh_token:
            connection.refresh_token_enc = encrypt_token(bundle.refresh_token)
        connection.token_expires_at = bundle.expires_at
        await self.db.commit()
        return bundle.access_token
