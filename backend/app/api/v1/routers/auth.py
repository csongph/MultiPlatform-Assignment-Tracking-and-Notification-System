import jwt
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user, get_db
from app.core.exceptions import AppError
from app.core.security import TokenType, decode_token
from app.models.auth import User
from app.schemas.auth import (
    RefreshTokenRequest,
    TokenResponse,
    UserLoginRequest,
    UserOut,
    UserRegisterRequest,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=201)
async def register(payload: UserRegisterRequest, db: AsyncSession = Depends(get_db)):
    try:
        user = await AuthService(db).register(payload.email, payload.password, payload.display_name)
    except AppError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
    return user


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLoginRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    try:
        user = await service.authenticate(payload.email, payload.password)
    except AppError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    access_token, refresh_token = service.issue_tokens(user)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    try:
        token_payload = decode_token(payload.refresh_token, TokenType.REFRESH)
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    from uuid import UUID

    from app.repositories.user_repository import UserRepository

    user = await UserRepository(db).get_by_id(UUID(token_payload["sub"]))
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    access_token, new_refresh_token = AuthService.issue_tokens(user)
    return TokenResponse(access_token=access_token, refresh_token=new_refresh_token)


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return current_user
