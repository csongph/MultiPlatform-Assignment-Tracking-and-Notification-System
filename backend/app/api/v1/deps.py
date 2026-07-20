import uuid
from typing import AsyncGenerator

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import TokenType, decode_token
from app.models.auth import User
from app.repositories.user_repository import UserRepository

# re-exported so routers can `from app.api.v1.deps import get_db, get_current_user`
__all__ = ["get_db", "get_current_user"]

_bearer_scheme = HTTPBearer(auto_error=True)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_token(credentials.credentials, TokenType.ACCESS)
        user_id = uuid.UUID(payload["sub"])
    except (jwt.PyJWTError, ValueError, KeyError):
        raise unauthorized

    user = await UserRepository(db).get_by_id(user_id)
    if user is None or not user.is_active:
        raise unauthorized

    return user
