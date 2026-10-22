from datetime import datetime, timedelta, timezone
from pathlib import Path
import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.api.v1.routers import auth as auth_router
from app.core.database import get_db
from app.core.security import hash_password
from app.main import app as asgi_app
from app.models import PasswordRecoveryToken, Role, User, UserRole
from app.services import auth_service, password_recovery_service

fastapi_app = asgi_app.app


class AuditLogSink:
    """Keep the route test database focused on recovery and authentication."""

    def __init__(self, _db):
        pass

    async def create(self, **_values):
        return None


@pytest_asyncio.fixture
async def recovery_client(monkeypatch):
    database_path = Path.cwd() / f".password-recovery-test-{uuid.uuid4().hex}.sqlite3"
    engine = create_async_engine(f"sqlite+aiosqlite:///{database_path}")
    async with engine.begin() as connection:
        await connection.run_sync(Role.__table__.create)
        await connection.run_sync(User.__table__.create)
        await connection.run_sync(UserRole.__table__.create)
        await connection.run_sync(PasswordRecoveryToken.__table__.create)
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    sent_codes: dict[str, str] = {}
    sent_notices: list[str] = []

    async def override_db():
        async with sessions() as session:
            yield session

    async def allow_test_request():
        return None

    async def capture_recovery_email(*, recipient: str, code: str, expires_in_minutes: int):
        assert expires_in_minutes > 0
        sent_codes[recipient] = code

    async def capture_password_notice(*, recipient: str):
        sent_notices.append(recipient)

    fastapi_app.dependency_overrides[get_db] = override_db
    fastapi_app.dependency_overrides[auth_router.forgot_password_rate_limit] = allow_test_request
    fastapi_app.dependency_overrides[auth_router.verify_otp_rate_limit] = allow_test_request
    fastapi_app.dependency_overrides[auth_router.reset_password_rate_limit] = allow_test_request
    monkeypatch.setattr(auth_service, "AuditLogRepository", AuditLogSink)
    monkeypatch.setattr(password_recovery_service, "password_recovery_email_is_configured", lambda: True)
    monkeypatch.setattr(password_recovery_service, "send_password_recovery_code", capture_recovery_email)
    monkeypatch.setattr(password_recovery_service, "send_password_changed_notice", capture_password_notice)

    async with AsyncClient(transport=ASGITransport(app=asgi_app), base_url="http://testserver") as client:
        yield client, sessions, sent_codes, sent_notices

    fastapi_app.dependency_overrides.clear()
    await engine.dispose()
    database_path.unlink(missing_ok=True)


async def add_user(sessions, email: str, password: str = "old-password-123") -> User:
    user = User(
        id=uuid.uuid4(),
        email=email,
        password_hash=hash_password(password),
        display_name="Recovery Test User",
        is_active=True,
    )
    async with sessions() as session:
        if (await session.execute(select(Role).where(Role.id == 1))).scalar_one_or_none() is None:
            session.add(Role(id=1, name="student"))
            await session.flush()
        session.add(user)
        session.add(UserRole(user_id=user.id, role_id=1))
        await session.commit()
    return user


@pytest.mark.asyncio
async def test_password_recovery_end_to_end_updates_login_password(recovery_client):
    client, sessions, sent_codes, sent_notices = recovery_client
    email = "recovery-user@example.com"
    await add_user(sessions, email)

    requested = await client.post("/api/v1/auth/forgot-password", json={"email": email})
    assert requested.status_code == 202
    assert "otp" not in requested.text.lower()
    otp = sent_codes[email]

    verified = await client.post("/api/v1/auth/verify-otp", json={"email": email, "otp": otp})
    assert verified.status_code == 200
    assert otp not in verified.text

    reset = await client.post(
        "/api/v1/auth/reset-password",
        json={"email": email, "otp": otp, "new_password": "new-password-456"},
    )
    assert reset.status_code == 200
    assert "new-password-456" not in reset.text
    assert sent_notices == [email]

    new_login = await client.post("/api/v1/auth/login", json={"email": email, "password": "new-password-456"})
    old_login = await client.post("/api/v1/auth/login", json={"email": email, "password": "old-password-123"})
    assert new_login.status_code == 200
    assert old_login.status_code == 401

    reused = await client.post(
        "/api/v1/auth/reset-password",
        json={"email": email, "otp": otp, "new_password": "another-password-789"},
    )
    assert reused.status_code == 400
    assert reused.json()["detail"] == "รหัสไม่ถูกต้องหรือหมดอายุ กรุณาขอรหัสใหม่"


@pytest.mark.asyncio
async def test_forgot_password_response_is_identical_for_unknown_and_known_email(recovery_client):
    client, sessions, _sent_codes, _sent_notices = recovery_client
    email = "known-user@example.com"
    await add_user(sessions, email)

    known = await client.post("/api/v1/auth/forgot-password", json={"email": email})
    unknown = await client.post("/api/v1/auth/forgot-password", json={"email": "unknown-user@example.com"})
    assert known.status_code == unknown.status_code == 202
    assert known.content == unknown.content


@pytest.mark.asyncio
async def test_unconfigured_email_service_returns_same_error_without_checking_account(recovery_client, monkeypatch):
    client, _sessions, _sent_codes, _sent_notices = recovery_client
    monkeypatch.setattr(password_recovery_service, "password_recovery_email_is_configured", lambda: False)

    known = await client.post(
        "/api/v1/auth/forgot-password", json={"email": "possibly-known@example.com"}
    )
    unknown = await client.post(
        "/api/v1/auth/forgot-password", json={"email": "unregistered@example.com"}
    )
    assert known.status_code == unknown.status_code == 503
    assert known.content == unknown.content
    assert known.json()["detail"] == "ระบบส่งอีเมลยังไม่พร้อม กรุณาติดต่อผู้ดูแลระบบ"


@pytest.mark.asyncio
async def test_forgot_password_cooldown_and_five_invalid_otp_attempts(recovery_client):
    client, sessions, sent_codes, _sent_notices = recovery_client
    email = "attempt-user@example.com"
    await add_user(sessions, email)

    first = await client.post("/api/v1/auth/forgot-password", json={"email": email})
    second = await client.post("/api/v1/auth/forgot-password", json={"email": email})
    assert first.status_code == second.status_code == 202
    assert first.content == second.content
    otp = sent_codes[email]
    wrong_otp = "000000" if otp != "000000" else "000001"

    for _ in range(5):
        invalid = await client.post("/api/v1/auth/verify-otp", json={"email": email, "otp": wrong_otp})
        assert invalid.status_code == 400
        assert invalid.json()["detail"] == "รหัสไม่ถูกต้องหรือหมดอายุ กรุณาขอรหัสใหม่"

    rejected_after_limit = await client.post("/api/v1/auth/verify-otp", json={"email": email, "otp": otp})
    assert rejected_after_limit.status_code == 400


@pytest.mark.asyncio
async def test_expired_otp_has_the_same_error_as_invalid_otp(recovery_client):
    client, sessions, sent_codes, _sent_notices = recovery_client
    email = "expired-user@example.com"
    await add_user(sessions, email)
    await client.post("/api/v1/auth/forgot-password", json={"email": email})
    otp = sent_codes[email]

    async with sessions() as session:
        recovery = (await session.execute(select(PasswordRecoveryToken))).scalar_one()
        recovery.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
        await session.commit()

    expired = await client.post("/api/v1/auth/verify-otp", json={"email": email, "otp": otp})
    invalid = await client.post("/api/v1/auth/verify-otp", json={"email": "expired-user@example.com", "otp": "123456"})
    assert expired.status_code == invalid.status_code == 400
    assert expired.content == invalid.content
