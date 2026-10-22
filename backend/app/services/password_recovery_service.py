import hashlib
import hmac
import logging
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import hash_password
from app.models import PasswordRecoveryToken, User
from app.services.email_service import (
    EmailDeliveryError,
    password_recovery_email_is_configured,
    send_password_changed_notice,
    send_password_recovery_code,
)

logger = logging.getLogger(__name__)
RECOVERY_ERROR = "รหัสไม่ถูกต้องหรือหมดอายุ กรุณาขอรหัสใหม่"


class InvalidRecoveryRequest(Exception):
    """Raised when a recovery code or reset token cannot be used."""


def _is_expired(expires_at: datetime, now: datetime) -> bool:
    # PostgreSQL returns aware timestamps. SQLite test databases return naive
    # values even for DateTime(timezone=True), so interpret those as UTC.
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return expires_at <= now


def _token_digest(value: str) -> str:
    return hmac.new(
        settings.JWT_SECRET_KEY.encode("utf-8"), value.encode("utf-8"), hashlib.sha256
    ).hexdigest()


async def request_password_recovery(db: AsyncSession, email: str) -> None:
    if not password_recovery_email_is_configured():
        logger.error("Password recovery email service is not configured")
        raise EmailDeliveryError("Password recovery email service is not configured")

    normalized_email = email.strip().lower()
    now = datetime.now(timezone.utc)
    user_result = await db.execute(
        select(User)
        .where(func.lower(User.email) == normalized_email)
        .with_for_update()
    )
    user = user_result.scalar_one_or_none()
    if user is None or not user.is_active or not user.password_hash:
        return

    cooldown_start = now - timedelta(seconds=settings.PASSWORD_RESET_COOLDOWN_SECONDS)
    recent_result = await db.execute(
        select(PasswordRecoveryToken.id)
        .where(
            PasswordRecoveryToken.user_id == user.id,
            PasswordRecoveryToken.created_at >= cooldown_start,
        )
        .limit(1)
        .with_for_update()
    )
    if recent_result.scalar_one_or_none() is not None:
        return

    await db.execute(
        update(PasswordRecoveryToken)
        .where(PasswordRecoveryToken.user_id == user.id, PasswordRecoveryToken.is_used.is_(False))
        .values(is_used=True)
    )
    code = f"{secrets.randbelow(1_000_000):06d}"
    recovery = PasswordRecoveryToken(
        id=uuid.uuid4(),
        user_id=user.id,
        token_hash=_token_digest(code),
        token_type="otp",
        attempt_count=0,
        expires_at=now + timedelta(minutes=settings.PASSWORD_RESET_OTP_TTL_MINUTES),
        is_used=False,
    )
    db.add(recovery)
    await db.commit()

    try:
        await send_password_recovery_code(
            recipient=user.email,
            code=code,
            expires_in_minutes=settings.PASSWORD_RESET_OTP_TTL_MINUTES,
        )
    except EmailDeliveryError as exc:
        logger.error("Password recovery email could not be delivered: %s", exc)
        failed_result = await db.execute(
            select(PasswordRecoveryToken).where(PasswordRecoveryToken.id == recovery.id)
        )
        failed_recovery = failed_result.scalar_one_or_none()
        if failed_recovery is not None:
            failed_recovery.is_used = True
            await db.commit()


async def verify_password_recovery_code(db: AsyncSession, email: str, code: str) -> None:
    normalized_email = email.strip().lower()
    user_result = await db.execute(
        select(User)
        .where(func.lower(User.email) == normalized_email, User.is_active.is_(True))
        .with_for_update()
    )
    user = user_result.scalar_one_or_none()
    if user is None:
        raise InvalidRecoveryRequest(RECOVERY_ERROR)

    result = await db.execute(
        select(PasswordRecoveryToken)
        .where(
            PasswordRecoveryToken.user_id == user.id,
            PasswordRecoveryToken.token_type == "otp",
            PasswordRecoveryToken.is_used.is_(False),
        )
        .order_by(PasswordRecoveryToken.created_at.desc())
        .limit(1)
        .with_for_update()
    )
    recovery = result.scalar_one_or_none()
    now = datetime.now(timezone.utc)
    if recovery is None:
        raise InvalidRecoveryRequest(RECOVERY_ERROR)

    if _is_expired(recovery.expires_at, now) or recovery.attempt_count >= settings.PASSWORD_RESET_MAX_OTP_ATTEMPTS:
        recovery.is_used = True
        await db.commit()
        raise InvalidRecoveryRequest(RECOVERY_ERROR)

    if not hmac.compare_digest(recovery.token_hash, _token_digest(code)):
        recovery.attempt_count += 1
        if recovery.attempt_count >= settings.PASSWORD_RESET_MAX_OTP_ATTEMPTS:
            recovery.is_used = True
        await db.commit()
        raise InvalidRecoveryRequest(RECOVERY_ERROR)

    recovery.token_type = "verified"
    await db.commit()


async def reset_password(db: AsyncSession, email: str, code: str, new_password: str) -> None:
    normalized_email = email.strip().lower()
    user_result = await db.execute(
        select(User)
        .where(func.lower(User.email) == normalized_email, User.is_active.is_(True))
        .with_for_update()
    )
    user = user_result.scalar_one_or_none()
    if user is None:
        raise InvalidRecoveryRequest(RECOVERY_ERROR)

    result = await db.execute(
        select(PasswordRecoveryToken)
        .where(
            PasswordRecoveryToken.user_id == user.id,
            PasswordRecoveryToken.token_hash == _token_digest(code),
            PasswordRecoveryToken.token_type == "verified",
            PasswordRecoveryToken.is_used.is_(False),
        )
        .with_for_update()
    )
    recovery = result.scalar_one_or_none()
    now = datetime.now(timezone.utc)
    if recovery is None:
        raise InvalidRecoveryRequest(RECOVERY_ERROR)
    if _is_expired(recovery.expires_at, now):
        recovery.is_used = True
        await db.commit()
        raise InvalidRecoveryRequest(RECOVERY_ERROR)

    if recovery.user_id != user.id:
        recovery.is_used = True
        await db.commit()
        raise InvalidRecoveryRequest(RECOVERY_ERROR)

    user.password_hash = hash_password(new_password)
    recovery.is_used = True
    await db.execute(
        update(PasswordRecoveryToken)
        .where(
            PasswordRecoveryToken.user_id == user.id,
            PasswordRecoveryToken.id != recovery.id,
            PasswordRecoveryToken.is_used.is_(False),
        )
        .values(is_used=True)
    )
    await db.commit()
    try:
        await send_password_changed_notice(recipient=user.email)
    except EmailDeliveryError as exc:
        logger.error("Password change confirmation email could not be delivered: %s", exc)
