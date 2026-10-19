import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user, get_db
from app.core.exceptions import AppError
from app.models.auth import User
from app.schemas.learning import (
    AssignmentOut,
    CourseOut,
    DashboardSummary,
    NotificationOut,
    NotificationRuleCreate,
    NotificationRuleOut,
    NotificationRuleUpdate,
    NotificationSettingsOut,
    NotificationSettingsUpdate,
    PersonalAssignmentStatusOut,
    PersonalAssignmentStatusUpdate,
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
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=100, ge=1, le=500),
    status: str | None = None,
    course_id: uuid.UUID | None = None,
    due_before: datetime | None = None,
    include_deleted: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    assignments = await LearningService(db).list_assignments(
        user_id=current_user.id,
        status=status,
        course_id=course_id,
        due_before=due_before,
        include_deleted=include_deleted,
    )
    start = (page - 1) * page_size
    return assignments[start:start + page_size]


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


@router.put("/assignments/{assignment_id}/personal-status", response_model=PersonalAssignmentStatusOut)
async def update_personal_assignment_status(
    assignment_id: uuid.UUID,
    payload: PersonalAssignmentStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await LearningService(db).update_personal_assignment_status(
            current_user.id, assignment_id, payload
        )
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


@router.get("/notification-rules", response_model=list[NotificationRuleOut])
async def list_notification_rules(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await LearningService(db).list_notification_rules(current_user.id)


@router.post("/notification-rules", response_model=NotificationRuleOut, status_code=status.HTTP_201_CREATED)
async def create_notification_rule(
    payload: NotificationRuleCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await LearningService(db).create_notification_rule(current_user.id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.patch("/notification-rules/{rule_id}", response_model=NotificationRuleOut)
async def update_notification_rule(
    rule_id: uuid.UUID,
    payload: NotificationRuleUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await LearningService(db).update_notification_rule(current_user.id, rule_id, payload)
    except AppError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.delete("/notification-rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification_rule(
    rule_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        await LearningService(db).delete_notification_rule(current_user.id, rule_id)
    except AppError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/notifications", response_model=list[NotificationOut])
async def list_notifications(
    status: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await LearningService(db).list_notifications(current_user.id, status)


@router.post("/notifications/mark-all-read", response_model=list[NotificationOut])
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    return await LearningService(db).mark_all_notifications_read(current_user.id)


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
        if payload.user_id is not None and payload.user_id != current_user.id:
            roles = {role.role.name for role in current_user.user_roles}
            if "admin" not in roles:
                raise HTTPException(status_code=403, detail="Only administrators can sync another user's account.")
        return await LearningService(db).queue_sync(
            current_user.id, payload.platform, connection_user_id=payload.user_id
        )
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
