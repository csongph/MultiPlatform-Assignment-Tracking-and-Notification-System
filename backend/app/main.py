from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1 import api_router
from app.core.config import settings
from app.core.database import get_db
from app.log_buffer import install_log_buffer

app = FastAPI(title="MultiPlatform Assignment Tracking API", version="1.0.0")

install_log_buffer()

origins = [
    settings.FRONTEND_ORIGIN,
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:5501",
    "http://127.0.0.1:5501",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health(db: AsyncSession = Depends(get_db)):
    """
    Public health check (M15, no auth) - the Admin Console's Monitoring
    tab renders `status` as a colored dot and `checks` as a one-line
    breakdown (see renderHealth() in frontend/js/admin.js).
    """
    checks: dict[str, str] = {}

    try:
        await db.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception:  # noqa: BLE001 - report degraded rather than 500 on a health check
        checks["database"] = "error"

    try:
        import redis.asyncio as redis_asyncio

        client = redis_asyncio.from_url(settings.REDIS_URL, socket_connect_timeout=2, socket_timeout=2)
        try:
            await client.ping()
            checks["queue"] = "ok"
        finally:
            await client.aclose()
    except Exception:  # noqa: BLE001
        checks["queue"] = "error"

    if all(v == "ok" for v in checks.values()):
        status = "healthy"
    elif checks.get("database") == "ok":
        status = "degraded"
    else:
        status = "unhealthy"

    return {"status": status, "checks": checks}


@app.get("/api/v1/ping")
async def ping():
    return {"message": "KMAPS MultiPlatform Assignment Tracking API is running."}
