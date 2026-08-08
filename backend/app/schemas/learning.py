import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class DashboardSummary(BaseModel):
    total_courses: int
    total_assignments: int
    due_soon: int
    overdue: int
    connected_platforms: list[str]


class CourseOut(BaseModel):
    id: uuid.UUID
    platform: str
    external_course_id: str
    name: str
    is_deleted: bool


class AssignmentOut(BaseModel):
    id: uuid.UUID
    course_id: uuid.UUID
    course_name: str
    platform: str
    title: str
    description: str | None
    due_at: datetime | None
    source_status: str
    computed_status: str
    source_url: str
    is_deleted: bool
    last_synced_at: datetime


class NotificationSettingsOut(BaseModel):
    id: uuid.UUID
    lead_time_minutes: int
    new_assignment_enabled: bool
    due_soon_enabled: bool
    overdue_enabled: bool
    channel: str

    model_config = {"from_attributes": True}


class NotificationSettingsUpdate(BaseModel):
    lead_time_minutes: int = Field(ge=1, le=43200)
    new_assignment_enabled: bool
    due_soon_enabled: bool
    overdue_enabled: bool
    channel: str = Field(pattern="^(push|email|both)$")


class NotificationOut(BaseModel):
    id: uuid.UUID
    assignment_id: uuid.UUID | None
    type: str
    status: str
    retry_count: int
    scheduled_at: datetime
    delivered_at: datetime | None

    model_config = {"from_attributes": True}


class SyncRequest(BaseModel):
    platform: str


class SyncJobOut(BaseModel):
    job_id: uuid.UUID
    platform: str
    status: str
    items_synced: int
    error_detail: dict | None
    created_at: datetime
    finished_at: datetime | None
