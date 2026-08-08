import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user, get_db, require_role
from app.core.exceptions import AppError
from app.models.auth import User
from app.schemas.admin import (
    AdminAlertsOut,
    AdminAuditLogListOut,
    AdminConnectionListOut,
    AdminErrorSummaryOut,
    AdminRoleUpdateRequest,
    AdminServerLogsOut,
    AdminStatusUpdateRequest,
    AdminSyncStatusOut,
    AdminUserListOut,
    AdminUserOut,
)
from app.services.admin_service import AdminService

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_role("admin"))])


# ---------------------------------------------------------------------------
# M12: Users & Role Management
# ---------------------------------------------------------------------------

@router.get("/users", response_model=AdminUserListOut)
async def list_users(
    search: str = Query(default=""),
    page: int = Query(default=1, ge=1),
    db: AsyncSession = Depends(get_db),
):
    return await AdminService(db).list_users(search=search, page=page)


@router.put("/users/{user_id}/role", response_model=AdminUserOut)
async def update_user_role(
    user_id: uuid.UUID,
    payload: AdminRoleUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await AdminService(db).update_role(current_user, user_id, payload.role)
    except AppError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.patch("/users/{user_id}/status", response_model=AdminUserOut)
async def update_user_status(
    user_id: uuid.UUID,
    payload: AdminStatusUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user_id == current_user.id and not payload.is_active:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account.")
    try:
        return await AdminService(db).update_status(current_user, user_id, payload.is_active)
    except AppError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


# ---------------------------------------------------------------------------
# M13: Connection Monitoring
# ---------------------------------------------------------------------------

@router.get("/connections", response_model=AdminConnectionListOut)
async def list_connections(
    status: str = Query(default=""),
    db: AsyncSession = Depends(get_db),
):
    rows = await AdminService(db).list_connections(status_filter=status)
    return {"connections": rows}


@router.patch("/connections/{user_id}/{platform}/stale")
async def flag_connection_stale(
    user_id: uuid.UUID,
    platform: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await AdminService(db).flag_connection_stale(current_user, user_id, platform)
    except AppError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.get("/connections/export")
async def export_connections(db: AsyncSession = Depends(get_db)):
    csv_text = await AdminService(db).export_connections_csv()
    return StreamingResponse(
        iter([csv_text]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=connections.csv"},
    )


# ---------------------------------------------------------------------------
# M14: Audit Logging
# ---------------------------------------------------------------------------

@router.get("/audit-logs", response_model=AdminAuditLogListOut)
async def list_audit_logs(
    user: str = Query(default=""),
    action: str = Query(default=""),
    date: str = Query(default=""),
    page: int = Query(default=1, ge=1),
    db: AsyncSession = Depends(get_db),
):
    return await AdminService(db).list_audit_logs(user=user, action=action, date=date, page=page)


@router.get("/audit-logs/export")
async def export_audit_logs(
    user: str = Query(default=""),
    action: str = Query(default=""),
    date: str = Query(default=""),
    db: AsyncSession = Depends(get_db),
):
    csv_text = await AdminService(db).export_audit_logs_csv(user=user, action=action, date=date)
    return StreamingResponse(
        iter([csv_text]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=audit_logs.csv"},
    )


# ---------------------------------------------------------------------------
# M15: System Monitoring
# ---------------------------------------------------------------------------

@router.get("/monitoring/sync-status", response_model=AdminSyncStatusOut)
async def sync_status(db: AsyncSession = Depends(get_db)):
    return await AdminService(db).sync_status()


@router.get("/monitoring/errors", response_model=AdminErrorSummaryOut)
async def error_summary(db: AsyncSession = Depends(get_db)):
    return await AdminService(db).error_summary()


@router.get("/monitoring/alerts", response_model=AdminAlertsOut)
async def alerts(db: AsyncSession = Depends(get_db)):
    return await AdminService(db).alerts()


# ---------------------------------------------------------------------------
# M16: Server Log Viewer
# ---------------------------------------------------------------------------

@router.get("/server-logs", response_model=AdminServerLogsOut)
async def server_logs():
    return AdminService.server_logs()
