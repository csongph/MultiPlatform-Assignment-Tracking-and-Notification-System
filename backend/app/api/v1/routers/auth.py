import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.core.database import get_db
from app.core.security import decode_token
from app.models import User
from app.schemas.auth import (
    LoginRequest,
    ForgotPasswordRequest,
    RefreshRequest,
    RegisterRequest,
    RegisterResponse,
    ResetPasswordRequest,
    TokenResponse,
    UserOut,
    VerifyPasswordRecoveryCodeRequest,
)
from app.services.auth_service import (
    authenticate_user,
    get_user_by_id,
    issue_tokens,
    register_user,
    user_to_dict,
)
from app.services.email_service import EmailDeliveryError
from app.services.password_recovery_service import (
    InvalidRecoveryRequest,
    request_password_recovery,
    reset_password,
    verify_password_recovery_code,
)
from app.services.rate_limit_service import recovery_rate_limit

router = APIRouter(prefix="/auth", tags=["auth"])
forgot_password_rate_limit = recovery_rate_limit("forgot", 5, 60)
verify_otp_rate_limit = recovery_rate_limit("verify", 10, 60)
reset_password_rate_limit = recovery_rate_limit("reset", 5, 60)


@router.post("/forgot-password", status_code=status.HTTP_202_ACCEPTED)
async def forgot_password(
    request: Request,
    data: ForgotPasswordRequest,
    _rate_limit: None = Depends(forgot_password_rate_limit),
    db: AsyncSession = Depends(get_db),
):
    try:
        await request_password_recovery(db, str(data.email))
    except EmailDeliveryError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ระบบส่งอีเมลยังไม่พร้อม กรุณาติดต่อผู้ดูแลระบบ",
        ) from exc
    return {"message": "หากอีเมลนี้มีบัญชีอยู่ ระบบจะส่งรหัสกู้คืนไปให้"}


@router.post("/verify-otp")
async def verify_otp(
    request: Request,
    data: VerifyPasswordRecoveryCodeRequest,
    _rate_limit: None = Depends(verify_otp_rate_limit),
    db: AsyncSession = Depends(get_db),
):
    try:
        await verify_password_recovery_code(db, str(data.email), data.otp)
    except InvalidRecoveryRequest as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"message": "ยืนยันรหัสสำเร็จ ตั้งรหัสผ่านใหม่ได้"}


@router.post("/reset-password")
async def reset_password_endpoint(
    request: Request,
    data: ResetPasswordRequest,
    _rate_limit: None = Depends(reset_password_rate_limit),
    db: AsyncSession = Depends(get_db),
):
    try:
        await reset_password(db, str(data.email), data.otp, data.new_password)
    except InvalidRecoveryRequest as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"message": "ตั้งรหัสผ่านใหม่สำเร็จ กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่"}


@router.post("/register", response_model=RegisterResponse, status_code=201)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    user = await register_user(db, data)
    return {"user": user_to_dict(user)}


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(db, data.email, data.password)
    return issue_tokens(user.id)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")
    try:
        user_id = uuid.UUID(payload["sub"])
    except (KeyError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token payload") from exc
    user = await get_user_by_id(db, user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    return issue_tokens(user.id)


me_router = APIRouter(tags=["me"])


@me_router.get("/users/me", response_model=UserOut)
async def get_me(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.refresh(user, attribute_names=["user_roles"])
    return user_to_dict(user)
