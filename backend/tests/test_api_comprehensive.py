"""Isolated API/service regression tests. All persistence uses temporary SQLite;
provider, Redis, SMTP and Celery boundaries are mocked and never touch production.
"""

import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import Mock

import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.database import get_db
from app.core.security import create_access_token, create_refresh_token, hash_password
from app.main import app as wrapped_app
from app.models import (
    Assignment, AuditLog, Base, Course, Notification, NotificationSettings,
    OAuthConnection, Platform, Role, SyncLog, User, UserRole,
)


@compiles(JSONB, "sqlite")
def _compile_jsonb_for_sqlite(_type, _compiler, **_kw):
    return "JSON"


fastapi_app: FastAPI = wrapped_app.app


@pytest_asyncio.fixture
async def system(monkeypatch):
    db_path = Path.cwd() / f".api-comprehensive-{uuid.uuid4().hex}.sqlite3"
    engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    sessions = async_sessionmaker(engine, expire_on_commit=False)

    async def override_db():
        async with sessions() as session:
            yield session

    fastapi_app.dependency_overrides[get_db] = override_db
    async with sessions() as db:
        db.add_all([Role(id=1, name="student"), Role(id=2, name="admin")])
        db.add_all([Platform(id=1, name="google_classroom"), Platform(id=2, name="microsoft_teams")])
        await db.commit()
        student = await _make_user(db, "student@example.com", 1)
        admin = await _make_user(db, "admin@example.com", 2)
        other = await _make_user(db, "other@example.com", 1)
        course = Course(user_id=student.id, platform_id=1, external_course_id="gc-1", name="Physics")
        db.add(course)
        await db.flush()
        assignment = Assignment(
            course_id=course.id, external_assignment_id="a-1", title="Lab 1",
            description="Test assignment", due_at=datetime.now(timezone.utc)+timedelta(days=2),
            source_status="PUBLISHED", computed_status="not_submitted",
            source_url="https://classroom.google.com/a-1",
        )
        db.add(assignment)
        db.add(NotificationSettings(user_id=student.id, lead_time_minutes=60, channel="push"))
        db.add(NotificationSettings(user_id=other.id, lead_time_minutes=60, channel="push"))
        await db.commit()
        await db.refresh(assignment)
        await db.refresh(course)
        student_id, admin_id, other_id = student.id, admin.id, other.id
        course_id, assignment_id = course.id, assignment.id

    async with AsyncClient(transport=ASGITransport(app=wrapped_app), base_url="http://testserver") as client:
        yield {
            "client": client, "sessions": sessions,
            "student_id": student_id, "admin_id": admin_id, "other_id": other_id,
            "course_id": course_id, "assignment_id": assignment_id,
            "student_token": create_access_token(str(student_id)),
            "admin_token": create_access_token(str(admin_id)),
            "other_token": create_access_token(str(other_id)),
            "refresh_token": create_refresh_token(str(student_id)),
        }

    fastapi_app.dependency_overrides.clear()
    await engine.dispose()
    db_path.unlink(missing_ok=True)


async def _make_user(db, email: str, role_id: int, *, active=True, password="TestPass!234"):
    user = User(email=email, password_hash=hash_password(password), display_name=email.split("@")[0], is_active=active)
    db.add(user)
    await db.flush()
    db.add(UserRole(user_id=user.id, role_id=role_id))
    await db.flush()
    return user


def auth(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_health_ping_and_api_authentication(system, monkeypatch):
    import redis.asyncio as redis_asyncio

    class FakeRedis:
        async def ping(self):
            return True

        async def aclose(self):
            return None

    monkeypatch.setattr(redis_asyncio, "from_url", lambda *_args, **_kwargs: FakeRedis())
    c = system["client"]
    assert (await c.get("/api/v1/ping")).json()["message"].startswith("KMAPS")
    health = await c.get("/health")
    assert health.status_code == 200 and health.json()["checks"]["database"] == "ok"
    for endpoint in ["/api/v1/users/me", "/api/v1/dashboard/summary", "/api/v1/courses", "/api/v1/assignments", "/api/v1/notification-settings", "/api/v1/notifications", "/api/v1/sync"]:
        response = await c.get(endpoint) if endpoint != "/api/v1/sync" else await c.post(endpoint, json={"platform":"google_classroom"})
        assert response.status_code == 401, (endpoint, response.text)


@pytest.mark.asyncio
async def test_register_login_refresh_and_current_user(system):
    c = system["client"]
    created = await c.post("/api/v1/auth/register", json={"full_name":"New Student","email":"new@example.com","password":"TestPass!234"})
    assert created.status_code == 201
    assert created.json()["user"]["role"] == "student"
    duplicate = await c.post("/api/v1/auth/register", json={"full_name":"Duplicate","email":"new@example.com","password":"TestPass!234"})
    assert duplicate.status_code == 409
    login = await c.post("/api/v1/auth/login", json={"email":"student@example.com","password":"TestPass!234"})
    assert login.status_code == 200 and login.json()["access_token"]
    me = await c.get("/api/v1/users/me", headers=auth(login.json()["access_token"]))
    assert me.status_code == 200 and me.json()["email"] == "student@example.com"
    refreshed = await c.post("/api/v1/auth/refresh", json={"refresh_token":system["refresh_token"]})
    assert refreshed.status_code == 200 and refreshed.json()["refresh_token"]
    wrong_kind = await c.post("/api/v1/auth/refresh", json={"refresh_token":system["student_token"]})
    assert wrong_kind.status_code == 401


@pytest.mark.asyncio
async def test_auth_validation_and_inactive_user(system):
    c = system["client"]
    assert (await c.post("/api/v1/auth/register", json={"full_name":"x","email":"bad","password":"123"})).status_code == 422
    assert (await c.post("/api/v1/auth/login", json={"email":"student@example.com","password":"wrong"})).status_code == 401
    async with system["sessions"]() as db:
        inactive = await _make_user(db,"inactive@example.com",1,active=False)
        inactive_id = inactive.id
        await db.commit()
    response = await c.post("/api/v1/auth/login", json={"email":"inactive@example.com","password":"TestPass!234"})
    assert response.status_code == 403
    protected = await c.get("/api/v1/users/me", headers=auth(create_access_token(str(inactive_id))))
    assert protected.status_code == 401


@pytest.mark.asyncio
async def test_onboarding_platforms_connections_and_forbidden_direct_toggle(system):
    c=system["client"]; h=auth(system["student_token"])
    platforms=await c.get("/api/v1/oauth/platforms")
    assert platforms.status_code==200 and set(platforms.json()["platforms"]) >= {"google_classroom","microsoft_teams"}
    status=await c.get("/api/v1/onboarding-status",headers=h)
    assert status.status_code==200 and status.json()["has_connection"] is False
    connections=await c.get("/api/v1/oauth/connections",headers=h)
    assert connections.status_code==200 and connections.json()==[]
    toggle=await c.post("/api/v1/onboarding-status",headers=h,json={"provider":"google","connected":True})
    assert toggle.status_code==405
    assert (await c.get("/api/v1/onboarding-status",headers=h)).json()["has_connection"] is False


@pytest.mark.asyncio
async def test_oauth_authorize_disconnect_and_unknown_provider(system,monkeypatch):
    from app.core.config import settings
    c=system["client"]; h=auth(system["student_token"])
    monkeypatch.setattr(settings,"GOOGLE_OAUTH_CLIENT_ID","test-client")
    start=await c.get("/api/v1/oauth/google_classroom/authorize",headers=h)
    assert start.status_code==200 and "accounts.google.com" in start.json()["authorization_url"]
    unknown=await c.get("/api/v1/oauth/unknown/authorize",headers=h)
    assert unknown.status_code==404
    async with system["sessions"]() as db:
        conn=OAuthConnection(user_id=system["student_id"],platform_id=1,access_token_enc="enc-token",status="connected")
        db.add(conn); await db.commit()
    disconnected=await c.delete("/api/v1/oauth/google_classroom",headers=h)
    assert disconnected.status_code==204
    missing=await c.delete("/api/v1/oauth/google_classroom",headers=h)
    assert missing.status_code==404


@pytest.mark.asyncio
async def test_dashboard_courses_assignments_pagination_and_owner_isolation(system):
    c=system["client"]; h=auth(system["student_token"])
    summary=await c.get("/api/v1/dashboard/summary",headers=h)
    assert summary.status_code==200 and summary.json()["total_assignments"]==1
    courses=await c.get("/api/v1/courses",headers=h)
    assert courses.status_code==200 and courses.json()[0]["name"]=="Physics"
    assert (await c.get("/api/v1/courses?platform=bogus",headers=h)).status_code==404
    listing=await c.get("/api/v1/assignments?page=1&page_size=1",headers=h)
    assert listing.status_code==200 and len(listing.json())==1
    assert (await c.get("/api/v1/assignments?page=0",headers=h)).status_code==422
    assert (await c.get("/api/v1/assignments?page_size=501",headers=h)).status_code==422
    aid=system["assignment_id"]
    assert (await c.get(f"/api/v1/assignments/{aid}",headers=h)).status_code==200
    assert (await c.get(f"/api/v1/assignments/{uuid.uuid4()}",headers=h)).status_code==404
    other=await c.get(f"/api/v1/assignments/{aid}",headers=auth(system["other_token"]))
    assert other.status_code==404
    bad_uuid=await c.get("/api/v1/assignments/not-a-uuid",headers=h)
    assert bad_uuid.status_code==422


@pytest.mark.asyncio
async def test_personal_assignment_status_persists_and_is_user_scoped(system):
    c=system["client"]; aid=system["assignment_id"]
    body={"submitted":True,"personal_note":"ส่งแล้วจากระบบทดสอบ"}
    result=await c.put(f"/api/v1/assignments/{aid}/personal-status",headers=auth(system["student_token"]),json=body)
    assert result.status_code==200 and result.json()["submitted"] is True
    after=await c.get(f"/api/v1/assignments/{aid}",headers=auth(system["student_token"]))
    assert after.json()["personal_submitted"] is True and after.json()["personal_note"]==body["personal_note"]
    assert (await c.put(f"/api/v1/assignments/{aid}/personal-status",headers=auth(system["other_token"]),json=body)).status_code==404
    assert (await c.put(f"/api/v1/assignments/{aid}/personal-status",headers=auth(system["student_token"]),json={"submitted":"not-a-boolean"})).status_code==422


@pytest.mark.asyncio
async def test_notification_settings_rule_crud_validation_and_owner_isolation(system):
    c=system["client"]; h=auth(system["student_token"])
    current=await c.get("/api/v1/notification-settings",headers=h)
    assert current.status_code==200 and current.json()["channel"]=="push"
    changed=await c.put("/api/v1/notification-settings",headers=h,json={"lead_time_minutes":90,"new_assignment_enabled":False,"due_soon_enabled":True,"overdue_enabled":False,"channel":"email"})
    assert changed.status_code==200 and changed.json()["lead_time_minutes"]==90
    invalid=await c.put("/api/v1/notification-settings",headers=h,json={"lead_time_minutes":0,"new_assignment_enabled":True,"due_soon_enabled":True,"overdue_enabled":True,"channel":"sms"})
    assert invalid.status_code==422
    body={"type":"due_soon","assignment_id":str(system["assignment_id"]),"lead_time_value":2,"lead_time_unit":"hour","sequence_order":2,"is_enabled":True}
    created=await c.post("/api/v1/notification-rules",headers=h,json=body)
    assert created.status_code==201 and created.json()["lead_time_value"]==2
    rid=created.json()["id"]
    assert (await c.get("/api/v1/notification-rules",headers=h)).status_code==200
    assert (await c.patch(f"/api/v1/notification-rules/{rid}",headers=h,json={"is_enabled":False,"lead_time_value":3})).json()["is_enabled"] is False
    assert (await c.patch(f"/api/v1/notification-rules/{rid}",headers=auth(system["other_token"]),json={"is_enabled":True})).status_code==404
    assert (await c.delete(f"/api/v1/notification-rules/{rid}",headers=h)).status_code==204
    assert (await c.delete(f"/api/v1/notification-rules/{rid}",headers=h)).status_code==404


@pytest.mark.asyncio
async def test_notifications_mark_read_and_user_isolation(system):
    c=system["client"]
    async with system["sessions"]() as db:
        item=Notification(user_id=system["student_id"],assignment_id=system["assignment_id"],type="new",tier=1,status="pending",scheduled_at=datetime.now(timezone.utc))
        db.add(item); await db.commit(); await db.refresh(item); nid=item.id
    h=auth(system["student_token"])
    listing=await c.get("/api/v1/notifications?status=pending",headers=h)
    assert listing.status_code==200 and any(n["id"]==str(nid) for n in listing.json())
    marked=await c.post(f"/api/v1/notifications/{nid}/mark-read",headers=h)
    assert marked.status_code==200 and marked.json()["status"]=="read"
    wrong_owner=await c.post(f"/api/v1/notifications/{nid}/mark-read",headers=auth(system["other_token"]))
    assert wrong_owner.status_code==404
    all_read=await c.post("/api/v1/notifications/mark-all-read",headers=h)
    assert all_read.status_code==200


@pytest.mark.asyncio
async def test_sync_queue_and_job_status(system,monkeypatch):
    from worker.sync import sync_engine
    c=system["client"]
    monkeypatch.setattr(sync_engine.sync_connection_task,"delay",Mock())
    async with system["sessions"]() as db:
        db.add(OAuthConnection(user_id=system["student_id"],platform_id=1,access_token_enc="enc",status="connected")); await db.commit()
    h=auth(system["student_token"])
    queued=await c.post("/api/v1/sync",headers=h,json={"platform":"google_classroom"})
    assert queued.status_code==202
    job=queued.json()["job_id"]
    assert (await c.get(f"/api/v1/sync/{job}",headers=h)).status_code==200
    assert (await c.get(f"/api/v1/sync/{job}",headers=auth(system["other_token"]))).status_code==404
    assert (await c.post("/api/v1/sync",headers=h,json={"platform":"unknown"})).status_code==404
    assert (await c.post("/api/v1/sync",headers=h,json={"platform":"google_classroom","user_id":str(system['other_id'])})).status_code==403
    admin_job=await c.post("/api/v1/sync",headers=auth(system["admin_token"]),json={"platform":"google_classroom","user_id":str(system['student_id'])})
    assert admin_job.status_code==202


@pytest.mark.asyncio
async def test_webhook_local_validation_dedup_and_enqueue(system,monkeypatch):
    from app.api.v1.routers import webhooks
    from app.core.config import settings
    from worker.sync import sync_engine
    monkeypatch.setattr(settings,"APP_ENV","test")
    monkeypatch.setattr(settings,"GOOGLE_PUBSUB_PUSH_AUDIENCE","")
    monkeypatch.setattr(settings,"GOOGLE_PUBSUB_PUSH_SERVICE_ACCOUNT","")
    monkeypatch.setattr(settings,"GOOGLE_CLASSROOM_WEBHOOK_SECRET","")
    delay=Mock(); monkeypatch.setattr(sync_engine.sync_connection_task,"delay",delay)
    class FakeRedis:
        def __init__(self,duplicate=False): self.duplicate=duplicate; self.values={}
        async def get(self,key): return b'1' if self.duplicate else None
        async def set(self,key,value,**kwargs): self.values[key]=value
        async def aclose(self): pass
    redis=FakeRedis(); monkeypatch.setattr(webhooks.redis_asyncio,"from_url",lambda *a,**k:redis)
    async with system["sessions"]() as db:
        db.add(OAuthConnection(user_id=system["student_id"],platform_id=1,access_token_enc="enc",status="connected")); await db.commit()
    event={"eventId":"event-1","courseId":"gc-1","collection":"courses.courseWork"}
    ok=await system["client"].post("/api/v1/webhooks/google-classroom",json=event)
    assert ok.status_code==202 and ok.json()["queued"]==1 and delay.call_count==1
    redis.duplicate=True
    duplicate=await system["client"].post("/api/v1/webhooks/google-classroom",json=event)
    assert duplicate.status_code==202 and duplicate.json()["duplicate"] is True and delay.call_count==1
    malformed=await system["client"].post("/api/v1/webhooks/google-classroom",json={"eventId":"no-course"})
    assert malformed.status_code==400
    ignored=await system["client"].post("/api/v1/webhooks/google-classroom",json={"courseId":"gc-1","collection":"other.collection"})
    assert ignored.status_code==202 and ignored.json()["queued"]==0


@pytest.mark.asyncio
async def test_webhook_secret_and_production_configuration(system,monkeypatch):
    from app.core.config import settings
    c=system["client"]; event={"courseId":"x"}
    monkeypatch.setattr(settings,"APP_ENV","development")
    monkeypatch.setattr(settings,"GOOGLE_PUBSUB_PUSH_AUDIENCE","")
    monkeypatch.setattr(settings,"GOOGLE_PUBSUB_PUSH_SERVICE_ACCOUNT","")
    monkeypatch.setattr(settings,"GOOGLE_CLASSROOM_WEBHOOK_SECRET","test-secret")
    bad=await c.post("/api/v1/webhooks/google-classroom",json=event)
    assert bad.status_code==401
    good=await c.post("/api/v1/webhooks/google-classroom",json=event,headers={"X-Kmaps-Webhook-Secret":"test-secret"})
    assert good.status_code==202
    monkeypatch.setattr(settings,"APP_ENV","production")
    monkeypatch.setattr(settings,"GOOGLE_CLASSROOM_WEBHOOK_SECRET","")
    unavailable=await c.post("/api/v1/webhooks/google-classroom",json=event)
    assert unavailable.status_code==503


@pytest.mark.asyncio
async def test_admin_authorization_user_management_and_self_protection(system):
    c=system["client"]; admin=auth(system["admin_token"]); student=auth(system["student_token"])
    assert (await c.get("/api/v1/admin/users",headers=student)).status_code==403
    listing=await c.get("/api/v1/admin/users?search=other",headers=admin)
    assert listing.status_code==200 and listing.json()["total"]==1
    uid=str(system["other_id"])
    got=await c.get(f"/api/v1/admin/users/{uid}",headers=admin)
    assert got.status_code==200 and got.json()["email"]=="other@example.com"
    updated=await c.put(f"/api/v1/admin/users/{uid}",headers=admin,json={"full_name":"Changed"})
    assert updated.status_code==200 and updated.json()["full_name"]=="Changed"
    role=await c.put(f"/api/v1/admin/users/{uid}/role",headers=admin,json={"role":"admin"})
    assert role.status_code==200 and role.json()["role"]=="admin"
    status=await c.patch(f"/api/v1/admin/users/{uid}/status",headers=admin,json={"is_active":False})
    assert status.status_code==200 and status.json()["is_active"] is False
    self_deactivate=await c.patch(f"/api/v1/admin/users/{system['admin_id']}/status",headers=admin,json={"is_active":False})
    self_delete=await c.delete(f"/api/v1/admin/users/{system['admin_id']}",headers=admin)
    assert self_deactivate.status_code==400 and self_delete.status_code==400


@pytest.mark.asyncio
async def test_admin_connections_audit_exports_monitoring_and_logs(system):
    c=system["client"]; h=auth(system["admin_token"])
    async with system["sessions"]() as db:
        conn=OAuthConnection(user_id=system["student_id"],platform_id=1,access_token_enc="enc",status="connected")
        db.add(conn)
        db.add(AuditLog(actor_user_id=system["student_id"],action="test_action",target="student@example.com",metadata_={"x":1},created_at=datetime.now(timezone.utc)))
        db.add(SyncLog(user_id=system["student_id"],platform_id=1,status="failed",items_synced=0,error_detail={"error":"test failure"},started_at=datetime.now(timezone.utc)))
        await db.commit()
    connections=await c.get("/api/v1/admin/connections",headers=h)
    assert connections.status_code==200 and connections.json()["connections"]
    stale=await c.patch(f"/api/v1/admin/connections/{system['student_id']}/google/stale",headers=h)
    assert stale.status_code==200 and stale.json()["status"]=="stale"
    exported=await c.get("/api/v1/admin/connections/export",headers=h)
    assert exported.status_code==200 and "text/csv" in exported.headers["content-type"]
    audits=await c.get("/api/v1/admin/audit-logs?action=test_action",headers=h)
    assert audits.status_code==200 and audits.json()["total"]>=1
    csv=await c.get("/api/v1/admin/audit-logs/export?action=test_action",headers=h)
    assert csv.status_code==200 and "text/csv" in csv.headers["content-type"]
    assert (await c.get("/api/v1/admin/monitoring/sync-status",headers=h)).status_code==200
    errors=await c.get("/api/v1/admin/monitoring/errors",headers=h)
    assert errors.status_code==200
    assert (await c.get("/api/v1/admin/monitoring/alerts",headers=h)).status_code==200
    assert (await c.get("/api/v1/admin/server-logs",headers=h)).status_code==200
    assert (await c.get("/api/v1/admin/users?page=0",headers=h)).status_code==422


@pytest.mark.asyncio
async def test_pubsub_oidc_verifier_rejects_missing_or_unconfigured_identity(monkeypatch):
    from fastapi import HTTPException
    from app.api.v1.routers import webhooks
    from app.core.config import settings

    with pytest.raises(HTTPException) as missing:
        await webhooks._verify_pubsub_identity(None)
    assert missing.value.status_code == 401

    monkeypatch.setattr(settings, "GOOGLE_PUBSUB_PUSH_AUDIENCE", "")
    monkeypatch.setattr(settings, "GOOGLE_PUBSUB_PUSH_SERVICE_ACCOUNT", "")
    with pytest.raises(HTTPException) as unconfigured:
        await webhooks._verify_pubsub_identity("Bearer token")
    assert unconfigured.value.status_code == 503

