import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
)
from app.models import Role, User, UserRole
from app.models.core import NotificationSettings
from app.repositories.admin_repository import AuditLogRepository
from app.schemas.auth import RegisterRequest


def user_to_dict(user: User) -> dict:
    role_names = [ur.role.name for ur in user.user_roles]
    primary_role = "admin" if "admin" in role_names else (role_names[0] if role_names else "student")
    return {
        "id": user.id,
        "full_name": user.display_name,
        "email": user.email,
        "role": primary_role,
        "is_active": user.is_active,
        "created_at": user.created_at,
    }


async def register_user(db: AsyncSession, data: RegisterRequest) -> User:
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists.")

    result = await db.execute(select(Role).where(Role.name == "student"))
    student_role = result.scalar_one_or_none()
    if student_role is None:
        raise HTTPException(status_code=500, detail="Default role not seeded. Run scripts/seed_admin.py first.")

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        display_name=data.full_name,
        is_active=True,
    )
    db.add(user)
    await db.flush()

    # กำหนด role เป็น student
    db.add(UserRole(user_id=user.id, role_id=student_role.id))

    # ✅ สร้าง NotificationSettings default ให้ user ใหม่ทันที
    # ป้องกัน null settings error เมื่อ user ยังไม่ได้ตั้งค่าเอง
    db.add(NotificationSettings(
        user_id=user.id,
        lead_time_minutes=60,          # แจ้งเตือนล่วงหน้า 1 ชั่วโมง (default)
        new_assignment_enabled=True,   # แจ้งเมื่อมีงานใหม่
        due_soon_enabled=True,         # แจ้งก่อนถึงกำหนด
        overdue_enabled=True,          # แจ้งเมื่อเลยกำหนด
        channel="push",                # ช่องทาง push notification
    ))

    await db.commit()

    # ต้อง reload user พร้อม eager-load ความสัมพันธ์ที่ user_to_dict ต้องใช้
    result = await db.execute(
        select(User)
        .options(selectinload(User.user_roles).selectinload(UserRole.role))
        .where(User.id == user.id)
    )
    user = result.scalar_one()

    return user



async def authenticate_user(db: AsyncSession, email: str, password: str) -> User:
    result = await db.execute(
        select(User)
        .options(selectinload(User.user_roles).selectinload(UserRole.role))
        .where(User.email == email)
    )
    user = result.scalar_one_or_none()

    if user is None or not user.password_hash or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Your account has been disabled.")

    # Feeds the Admin Console's Audit Log tab (M14) - see PROJECT_DOC/
    # 14_admin_audit_logging.md for the list of actions that belong here.
    await AuditLogRepository(db).create(actor_user_id=user.id, action="login", target=user.email)

    return user


async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> User | None:
    """ใช้ตัวนี้ใน get_current_user dependency แทนของเดิม
    เพื่อให้ user.user_roles ถูก eager-load มาด้วย ป้องกัน MissingGreenlet error"""
    result = await db.execute(
        select(User)
        .options(selectinload(User.user_roles).selectinload(UserRole.role))
        .where(User.id == user_id)
    )
    return result.scalar_one_or_none()


def issue_tokens(user_id: uuid.UUID) -> dict:
    sub = str(user_id)
    return {
        "access_token": create_access_token(sub),
        "refresh_token": create_refresh_token(sub),
        "expires_in": 60 * 15,  # ต้องตรงกับ JWT_ACCESS_TOKEN_EXPIRE_MINUTES (15 นาที = 900 วิ)
    }