import logging
import re

import redis.asyncio as redis
from fastapi import HTTPException, Request, status
from redis.exceptions import RedisError

from app.core.config import settings

logger = logging.getLogger(__name__)
_client = redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=2, socket_timeout=2)
_WINDOW_COUNTER_SCRIPT = """
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('TTL', KEYS[1])
return {count, ttl}
"""


def recovery_rate_limit(bucket: str, maximum: int, window_seconds: int):
    safe_bucket = re.sub(r"[^a-zA-Z0-9_-]", "", bucket)

    async def enforce(request: Request) -> None:
        client_ip = request.client.host if request.client else "unknown"
        key = f"kmaps:rate-limit:password-recovery:{safe_bucket}:{client_ip}"
        try:
            count, ttl = await _client.eval(_WINDOW_COUNTER_SCRIPT, 1, key, window_seconds)
        except RedisError as exc:
            logger.error("Password recovery rate limiter is unavailable: %s", exc.__class__.__name__)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="ระบบจำกัดคำขอไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง",
            ) from exc

        if int(count) > maximum:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="คำขอถี่เกินไป กรุณารอสักครู่แล้วลองใหม่",
                headers={"Retry-After": str(max(1, int(ttl)))},
            )

    return enforce
