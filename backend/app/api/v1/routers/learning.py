import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user, get_db
from app.core.exceptions import AppError
from app.models.auth import User
from app.schemas.learning import (
    AssignmentOut,
    CourseOut,
    DashboardSummary,
    NotificationOut,
    NotificationSettingsOut,
    NotificationSettingsUpdate,
    SyncJobOut,
    SyncRequest,
)
from app.services.learning_service import LearningService

router = APIRouter(tags=["learning"])


@router.get("/dashboard/summary", response_model=DashboardSummary)
async def dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await LearningService(db).dashboard_summary(current_user.id)


@router.get("/courses", response_model=list[CourseOut])
async def list_courses(
    platform: str | None = None,
    include_deleted: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await LearningService(db).list_courses(current_user.id, platform, include_deleted)
    except AppError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.get("/assignments", response_model=list[AssignmentOut])
async def list_assignments(
    status: str | None = None,
    course_id: uuid.UUID | None = None,
    due_before: datetime | None = None,
    include_deleted: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await LearningService(db).list_assignments(
        user_id=current_user.id,
        status=status,
        course_id=course_id,
        due_before=due_before,
        include_deleted=include_deleted,
    )


@router.get("/assignments/{assignment_id}", response_model=AssignmentOut)
async def get_assignment(
    assignment_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await LearningService(db).get_assignment(current_user.id, assignment_id)
    except AppError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.get("/notification-settings", response_model=NotificationSettingsOut)
async def get_notification_settings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await LearningService(db).get_notification_settings(current_user.id)


@router.put("/notification-settings", response_model=NotificationSettingsOut)
async def update_notification_settings(
    payload: NotificationSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await LearningService(db).update_notification_settings(current_user.id, payload)


@router.get("/notifications", response_model=list[NotificationOut])
async def list_notifications(
    status: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await LearningService(db).list_notifications(current_user.id, status)


@router.post("/notifications/{notification_id}/mark-read", response_model=NotificationOut)
async def mark_notification_read(
    notification_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await LearningService(db).mark_notification_read(current_user.id, notification_id)
    except AppError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.post("/sync", response_model=SyncJobOut, status_code=202)
async def queue_sync(
    payload: SyncRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await LearningService(db).queue_sync(current_user.id, payload.platform)
    except AppError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.get("/sync/{job_id}", response_model=SyncJobOut)
async def get_sync(
    job_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await LearningService(db).get_sync(current_user.id, job_id)
    except AppError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
