import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# M12: Users & Role Management
# ---------------------------------------------------------------------------

class AdminUserOut(BaseModel):
    id: uuid.UUID
    full_name: str
    email: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AdminUserListOut(BaseModel):
    users: list[AdminUserOut]
    total: int
    page: int
    page_size: int


class AdminRoleUpdateRequest(BaseModel):
    # The Admin Console <select> submits "user" for the non-admin option
    # (its label reads "student"); the system's actual role name is
    # "student" everywhere else in the API (see auth_service.user_to_dict).
    # Accept both spellings here so the frontend doesn't need to change,
    # and normalize to the real role name before it reaches the service.
    role: str

    @field_validator("role")
    @classmethod
    def normalize_role(cls, value: str) -> str:
        normalized = "student" if value in ("user", "student") else value
        if normalized not in ("student", "admin"):
            raise ValueError("role must be 'student' (or 'user') or 'admin'")
        return normalized


class AdminStatusUpdateRequest(BaseModel):
    is_active: bool


# ---------------------------------------------------------------------------
# M13: Connection Monitoring
# ---------------------------------------------------------------------------

class AdminConnectionOut(BaseModel):
    user_id: uuid.UUID
    full_name: str
    email: str
    platform: str  # "google" | "microsoft" (short slug, matches frontend)
    status: str  # connected | expired | stale | broken
    connected: bool
    connected_at: datetime | None
    token_expires_at: datetime | None


class AdminConnectionListOut(BaseModel):
    connections: list[AdminConnectionOut]


# ---------------------------------------------------------------------------
# M14: Audit Logging
# ---------------------------------------------------------------------------

class AdminAuditLogOut(BaseModel):
    id: uuid.UUID
    created_at: datetime
    actor_email: str | None
    action: str
    target_email: str | None
    metadata: dict | None = Field(default=None)


class AdminAuditLogListOut(BaseModel):
    logs: list[AdminAuditLogOut]
    total: int
    page: int
    page_size: int


# ---------------------------------------------------------------------------
# M15: System Monitoring
# ---------------------------------------------------------------------------

class AdminSyncStatusOut(BaseModel):
    success_rate_percent: float
    queue_depth: int
    total_events_in_window: int
    window_minutes: int
    last_sync_at: datetime | None


class AdminErrorEntry(BaseModel):
    created_at: datetime
    user_email: str | None
    provider: str
    error_message: str | None


class AdminErrorSummaryOut(BaseModel):
    by_provider: dict[str, int]
    recent_failures: list[AdminErrorEntry]


class AdminAlert(BaseModel):
    message: str
    failure_rate_percent: float
    window_minutes: int


class AdminAlertsOut(BaseModel):
    alert: AdminAlert | None


class HealthCheckOut(BaseModel):
    status: str  # healthy | degraded | unhealthy
    checks: dict[str, str]


# ---------------------------------------------------------------------------
# M16: Server Log Viewer
# ---------------------------------------------------------------------------

class AdminServerLogsOut(BaseModel):
    logs: list[str]
