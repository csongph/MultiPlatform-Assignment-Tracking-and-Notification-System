import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import require_role
from app.core.database import get_db
from app.models import User
from app.schemas.admin import (
    AdminAuditLogListResponse,
    AdminConnectionListResponse,
    AdminUserListResponse,
    MonitoringAlertListResponse,
    MonitoringErrorListResponse,
    ServerLogListResponse,
    SyncStatusResponse,
)
from app.services.admin_service import (
    AdminAuditLogService,
    AdminConnectionService,
    AdminMonitoringService,
    AdminUserService,
)

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_role("admin"))])


@router.get("/users", response_model=AdminUserListResponse)
async def list_users(
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    db: AsyncSession = Depends(get_db),
):
    items, meta = await AdminUserService(db).list_users(search=search or None, page=page)
    return AdminUserListResponse(items=items, meta=meta)


@router.get("/connections", response_model=AdminConnectionListResponse)
async def list_connections(
    status: str | None = Query(default=None, description="Filter by connection status"),
    page: int = Query(default=1, ge=1),
    db: AsyncSession = Depends(get_db),
):
    items, meta = await AdminConnectionService(db).list_connections(page=page, status=status)
    return AdminConnectionListResponse(items=items, meta=meta)


@router.get("/audit-logs", response_model=AdminAuditLogListResponse)
async def list_audit_logs(
    user: uuid.UUID | None = Query(default=None, description="Filter by actor user id"),
    action: str | None = Query(default=None),
    date: date | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    db: AsyncSession = Depends(get_db),
):
    items, meta = await AdminAuditLogService(db).list_audit_logs(
        page=page, user_id=user, action=action or None, on_date=date
    )
    return AdminAuditLogListResponse(items=items, meta=meta)


@router.get("/monitoring/sync-status", response_model=SyncStatusResponse)
async def sync_status(
    window_hours: int = Query(default=24, ge=1, le=24 * 30),
    db: AsyncSession = Depends(get_db),
):
    return await AdminMonitoringService(db).sync_status(window_hours=window_hours)


@router.get("/monitoring/errors", response_model=MonitoringErrorListResponse)
async def monitoring_errors(
    page: int = Query(default=1, ge=1),
    db: AsyncSession = Depends(get_db),
):
    items, meta = await AdminMonitoringService(db).list_errors(page=page)
    return MonitoringErrorListResponse(items=items, meta=meta)


@router.get("/monitoring/alerts", response_model=MonitoringAlertListResponse)
async def monitoring_alerts(db: AsyncSession = Depends(get_db)):
    items = await AdminMonitoringService(db).list_alerts()
    return MonitoringAlertListResponse(items=items)


@router.get("/server-logs", response_model=ServerLogListResponse)
async def server_logs(
    page: int = Query(default=1, ge=1),
    db: AsyncSession = Depends(get_db),
):
    items, meta = await AdminMonitoringService(db).list_server_logs(page=page)
    return ServerLogListResponse(items=items, meta=meta)
