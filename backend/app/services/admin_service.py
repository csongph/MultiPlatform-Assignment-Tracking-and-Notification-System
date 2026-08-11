import csv
import io
import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.log_buffer import LOG_BUFFER
from app.models.auth import User
from app.models.core import OAuthConnection
from app.repositories.admin_repository import (
    AdminConnectionRepository,
    AdminUserRepository,
    AuditLogRepository,
    MonitoringRepository,
)

# Platform rows use the full adapter name; the Admin Console (and the rest
# of the frontend, see connectPlatform() in api.js) uses the short slug.
_PLATFORM_SLUG = {"google_classroom": "google", "microsoft_teams": "microsoft"}

ALERT_WINDOW_MINUTES = 15
ALERT_FAILURE_RATE_THRESHOLD = 5.0


def _connection_status(connection: OAuthConnection | None) -> str:
    if connection is None:
        return "broken"
    if connection.status in ("stale", "broken"):
        return connection.status
    if connection.token_expires_at is not None and connection.token_expires_at < datetime.now(timezone.utc):
        return "expired"
    return "connected"


class AdminService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.users = AdminUserRepository(db)
        self.connections = AdminConnectionRepository(db)
        self.audit_logs = AuditLogRepository(db)
        self.monitoring = MonitoringRepository(db)

    # -- M12: Users & Role Management ------------------------------------

    async def list_users(self, search: str, page: int, page_size: int = 20) -> dict:
        users, total = await self.users.search(search, page, page_size)
        return {
            "users": [self._user_out(u) for u in users],
            "total": total,
            "page": page,
            "page_size": page_size,
        }

    async def update_role(self, actor: User, user_id: uuid.UUID, role_name: str) -> dict:
        target = await self.users.get_by_id(user_id)
        if target is None:
            raise NotFoundError("User not found")

        role = await self.users.get_role_by_name(role_name)
        if role is None:
            raise NotFoundError(f"Role '{role_name}' is not seeded. Run scripts/seed_admin.py first.")

        await self.users.replace_role(target, role)

        await self.audit_logs.create(
            actor_user_id=actor.id,
            action="role_change",
            target=target.email,
            metadata={"new_role": role_name},
        )
        return self._user_out(target)

    async def update_status(self, actor: User, user_id: uuid.UUID, is_active: bool) -> dict:
        target = await self.users.get_by_id(user_id)
        if target is None:
            raise NotFoundError("User not found")

        await self.users.set_active(target, is_active)

        # JWT access tokens are short-lived (15 min, see JWT_ACCESS_TOKEN_
        # EXPIRE_MINUTES) and stateless - there is no session table to
        # revoke from. get_current_user already rejects any token whose
        # user has is_active=False, so deactivation takes effect on this
        # user's very next request without needing a revocation list.
        await self.audit_logs.create(
            actor_user_id=actor.id,
            action="deactivate_user" if not is_active else "reactivate_user",
            target=target.email,
        )
        return self._user_out(target)

    @staticmethod
    def _user_out(user: User) -> dict:
        # Matches auth_service.user_to_dict()'s role resolution so the role
        # shown in the Admin Console is always consistent with GET /users/me.
        role_names = [ur.role.name for ur in user.user_roles]
        role = "admin" if "admin" in role_names else (role_names[0] if role_names else "student")
        return {
            "id": user.id,
            "full_name": user.display_name,
            "email": user.email,
            "role": role,
            "is_active": user.is_active,
            "created_at": user.created_at,
        }

    # -- M13: Connection Monitoring ---------------------------------------

    async def list_connections(self, status_filter: str) -> list[dict]:
        users = await self.connections.list_users_with_connections()
        platforms = await self.connections.list_platforms()

        rows: list[dict] = []
        for user in users:
            by_platform = {c.platform.name: c for c in user.oauth_connections}
            for platform in platforms:
                connection = by_platform.get(platform.name)
                status = _connection_status(connection)
                if status_filter and status != status_filter:
                    continue
                rows.append(
                    {
                        "user_id": user.id,
                        "full_name": user.display_name,
                        "email": user.email,
                        "platform": _PLATFORM_SLUG.get(platform.name, platform.name),
                        "status": status,
                        "connected": connection is not None,
                        "connected_at": connection.connected_at if connection else None,
                        "token_expires_at": connection.token_expires_at if connection else None,
                    }
                )
        return rows

    async def flag_connection_stale(self, actor: User, user_id: uuid.UUID, platform_slug: str) -> dict:
        platform_name = {v: k for k, v in _PLATFORM_SLUG.items()}.get(platform_slug, platform_slug)
        connection = await self.connections.get_by_user_and_platform_name(user_id, platform_name)
        if connection is None:
            raise NotFoundError("No connection found for this user/platform")

        await self.connections.mark_stale(connection)

        target = await self.users.get_by_id(user_id)
        await self.audit_logs.create(
            actor_user_id=actor.id,
            action="connection_flag_stale",
            target=target.email if target else str(user_id),
            metadata={"platform": platform_slug},
        )

        return {
            "user_id": user_id,
            "full_name": target.display_name if target else "",
            "email": target.email if target else "",
            "platform": platform_slug,
            "status": "stale",
            "connected": True,
            "connected_at": connection.connected_at,
            "token_expires_at": connection.token_expires_at,
        }

    async def export_connections_csv(self) -> str:
        rows = await self.list_connections(status_filter="")
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(["email", "full_name", "platform", "status", "connected_at", "token_expires_at"])
        for row in rows:
            writer.writerow(
                [
                    row["email"],
                    row["full_name"],
                    row["platform"],
                    row["status"],
                    row["connected_at"].isoformat() if row["connected_at"] else "",
                    row["token_expires_at"].isoformat() if row["token_expires_at"] else "",
                ]
            )
        return buffer.getvalue()

    # -- M14: Audit Logging -------------------------------------------------

    async def list_audit_logs(self, user: str, action: str, date: str, page: int, page_size: int = 20) -> dict:
        logs, total = await self.audit_logs.search(user, action, date, page, page_size)
        return {
            "logs": [self._audit_log_out(log) for log in logs],
            "total": total,
            "page": page,
            "page_size": page_size,
        }

    async def export_audit_logs_csv(self, user: str, action: str, date: str) -> str:
        logs = await self.audit_logs.search_all(user, action, date)
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(["id", "created_at", "actor_email", "action", "target_email", "metadata"])
        for log in logs:
            out = self._audit_log_out(log)
            writer.writerow(
                [
                    out["id"],
                    out["created_at"].isoformat(),
                    out["actor_email"] or "",
                    out["action"],
                    out["target_email"] or "",
                    out["metadata"] or {},
                ]
            )
        return buffer.getvalue()

    @staticmethod
    def _audit_log_out(log) -> dict:
        return {
            "id": log.id,
            "created_at": log.created_at,
            "actor_email": log.actor.email if log.actor else None,
            "action": log.action,
            "target_email": log.target,
            "metadata": log.metadata_,
        }

    # -- M15: System Monitoring ----------------------------------------------

    async def sync_status(self) -> dict:
        events = await self.monitoring.sync_events_in_window(ALERT_WINDOW_MINUTES)
        total = len(events)
        success = sum(1 for e in events if e.status == "success")
        success_rate = round((success / total) * 100, 1) if total else 100.0

        return {
            "success_rate_percent": success_rate,
            "queue_depth": await self.monitoring.queue_depth(),
            "total_events_in_window": total,
            "window_minutes": ALERT_WINDOW_MINUTES,
            "last_sync_at": await self.monitoring.last_sync_at(),
        }

    async def error_summary(self) -> dict:
        by_platform_name = await self.monitoring.failure_counts_by_provider()
        by_provider = {_PLATFORM_SLUG.get(name, name): count for name, count in by_platform_name.items()}

        recent = await self.monitoring.recent_failures()
        recent_failures = [
            {
                "created_at": log.started_at,
                "user_email": log.user.email if log.user else None,
                "provider": _PLATFORM_SLUG.get(log.platform.name, log.platform.name),
                "error_message": (log.error_detail or {}).get("error") or (log.error_detail or {}).get("reason"),
            }
            for log in recent
        ]
        return {"by_provider": by_provider, "recent_failures": recent_failures}

    async def alerts(self) -> dict:
        events = await self.monitoring.sync_events_in_window(ALERT_WINDOW_MINUTES)
        total = len(events)
        failed = sum(1 for e in events if e.status == "failed")
        failure_rate = round((failed / total) * 100, 1) if total else 0.0

        if failure_rate > ALERT_FAILURE_RATE_THRESHOLD:
            return {
                "alert": {
                    "message": (
                        f"Sync failure rate is {failure_rate}% over the last "
                        f"{ALERT_WINDOW_MINUTES} minutes ({failed}/{total} jobs failed)."
                    ),
                    "failure_rate_percent": failure_rate,
                    "window_minutes": ALERT_WINDOW_MINUTES,
                }
            }
        return {"alert": None}

    # -- M16: Server Log Viewer -----------------------------------------------

    @staticmethod
    def server_logs() -> dict:
        return {"logs": list(LOG_BUFFER)}
