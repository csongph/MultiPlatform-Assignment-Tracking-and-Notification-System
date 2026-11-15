"""Check that the backend's configured Redis URL answers an actual PING."""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from redis.asyncio import from_url

from app.core.config import settings


async def main() -> int:
    client = from_url(
        settings.REDIS_URL,
        socket_connect_timeout=3,
        socket_timeout=3,
    )
    try:
        response = await client.ping()
        if response is not True:
            raise RuntimeError("Redis did not return PONG")
        print("Redis PING: PONG")
        return 0
    except Exception as exc:  # print Redis's useful protocol/auth error, if any
        print(f"Redis PING failed: {type(exc).__name__}: {exc}", file=sys.stderr)
        return 1
    finally:
        await client.aclose()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
