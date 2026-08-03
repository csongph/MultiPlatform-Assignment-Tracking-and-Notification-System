"""
Seed script: สร้าง roles, platforms พื้นฐาน และ Admin user คนแรก
รัน: python -m scripts.seed_admin
"""
import asyncio
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

import bcrypt
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models import Platform, Role, User, UserRole

# ==== แก้ค่าตรงนี้ก่อนรัน ====
ADMIN_EMAIL = "admin@kmitl.ac.th"
ADMIN_PASSWORD = "adminkmaps0130"
ADMIN_DISPLAY_NAME = "System Administrator"
# ============================


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


async def seed_roles(session) -> dict[str, Role]:
    result = await session.execute(select(Role))
    existing = {r.name: r for r in result.scalars().all()}

    for name in ("student", "admin"):
        if name not in existing:
            role = Role(name=name)
            session.add(role)
            existing[name] = role

    await session.flush()
    return existing


async def seed_platforms(session) -> None:
    result = await session.execute(select(Platform))
    existing = {p.name for p in result.scalars().all()}

    for name in ("google_classroom", "microsoft_teams"):
        if name not in existing:
            session.add(Platform(name=name))

    await session.flush()


async def seed_admin_user(session, roles: dict[str, Role]) -> None:
    result = await session.execute(select(User).where(User.email == ADMIN_EMAIL))
    user = result.scalar_one_or_none()

    if user:
        print(f"[skip] Admin user '{ADMIN_EMAIL}' มีอยู่แล้ว")
        return

    user = User(
        email=ADMIN_EMAIL,
        password_hash=hash_password(ADMIN_PASSWORD),
        display_name=ADMIN_DISPLAY_NAME,
        is_active=True,
    )
    session.add(user)
    await session.flush()  # ให้ user.id ถูก generate ก่อนใช้

    session.add(UserRole(user_id=user.id, role_id=roles["admin"].id))

    print(f"[created] Admin user: {ADMIN_EMAIL} / รหัสผ่านเริ่มต้น: {ADMIN_PASSWORD}")
    print("!! กรุณาเปลี่ยนรหัสผ่านทันทีหลัง Login ครั้งแรก !!")


async def main():
    async with AsyncSessionLocal() as session:
        async with session.begin():
            roles = await seed_roles(session)
            await seed_platforms(session)
            await seed_admin_user(session, roles)

    print("Seed เสร็จสมบูรณ์")


if __name__ == "__main__":
    asyncio.run(main())