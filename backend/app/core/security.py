import base64
import hashlib
import uuid
from datetime import datetime, timedelta, timezone
from enum import Enum

import jwt
from cryptography.fernet import Fernet, InvalidToken
from passlib.context import CryptContext

from app.core.config import settings

# ---------------------------------------------------------------------------
# Password hashing (for local email/password login)
# ---------------------------------------------------------------------------
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    return _pwd_context.hash(plain_password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    return _pwd_context.verify(plain_password, password_hash)


# ---------------------------------------------------------------------------
# JWT access / refresh tokens (our own auth, not the platform OAuth tokens)
# ---------------------------------------------------------------------------
class TokenType(str, Enum):
    ACCESS = "access"
    REFRESH = "refresh"
    OAUTH_STATE = "oauth_state"


def _create_token(subject: str, token_type: TokenType, expires_delta: timedelta, extra_claims: dict | None = None) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "type": token_type.value,
        "iat": now,
        "exp": now + expires_delta,
        "jti": str(uuid.uuid4()),
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_access_token(user_id: uuid.UUID | str) -> str:
    return _create_token(
        subject=str(user_id),
        token_type=TokenType.ACCESS,
        expires_delta=timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES),
    )


def create_refresh_token(user_id: uuid.UUID | str) -> str:
    return _create_token(
        subject=str(user_id),
        token_type=TokenType.REFRESH,
        expires_delta=timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS),
    )


def decode_token(token: str, expected_type: TokenType) -> dict:
    """Raises jwt.PyJWTError subclasses on failure; caller handles it."""
    payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    if payload.get("type") != expected_type.value:
        raise jwt.InvalidTokenError("Unexpected token type")
    return payload


# ---------------------------------------------------------------------------
# OAuth CSRF "state" token — short-lived, ties the callback back to
# (user_id, platform) so nobody can forge a callback for someone else.
# ---------------------------------------------------------------------------
def create_oauth_state_token(user_id: uuid.UUID | str, platform: str) -> str:
    return _create_token(
        subject=str(user_id),
        token_type=TokenType.OAUTH_STATE,
        expires_delta=timedelta(minutes=10),
        extra_claims={"platform": platform},
    )


def decode_oauth_state_token(token: str) -> dict:
    """Returns {"sub": user_id, "platform": platform}. Raises jwt errors on failure."""
    return decode_token(token, TokenType.OAUTH_STATE)


# ---------------------------------------------------------------------------
# Symmetric encryption for storing OAuth access/refresh tokens at rest.
# TOKEN_ENCRYPTION_KEY can be any string in .env — we derive a valid
# 32-byte urlsafe-base64 Fernet key from it via SHA-256 so you don't have
# to hand-generate a Fernet key yourself.
# ---------------------------------------------------------------------------
def _get_fernet() -> Fernet:
    digest = hashlib.sha256(settings.TOKEN_ENCRYPTION_KEY.encode("utf-8")).digest()
    fernet_key = base64.urlsafe_b64encode(digest)
    return Fernet(fernet_key)


def encrypt_token(raw_token: str) -> str:
    return _get_fernet().encrypt(raw_token.encode("utf-8")).decode("utf-8")


def decrypt_token(encrypted_token: str) -> str:
    try:
        return _get_fernet().decrypt(encrypted_token.encode("utf-8")).decode("utf-8")
    except InvalidToken as exc:
        raise ValueError("Could not decrypt stored token — TOKEN_ENCRYPTION_KEY may have changed") from exc
