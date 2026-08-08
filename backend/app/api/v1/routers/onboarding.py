import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.core.database import get_db
from app.models import OAuthConnection, Platform, User
from app.schemas.auth import OnboardingStatusResponse, OnboardingUpdateRequest

router = APIRouter(tags=["onboarding"])

PROVIDER_TO_PLATFORM = {"google": "google_classroom", "microsoft": "microsoft_teams"}


async def _get_connections(db: AsyncSession, user_id: uuid.UUID) -> dict:
    result = await db.execute(
        select(Platform.name, OAuthConnection.status)
        .join(OAuthConnection, OAuthConnection.platform_id == Platform.id)
        .where(OAuthConnection.user_id == user_id)
    )
    rows = {name: status for name, status in result.all()}
    return {
        "google": rows.get("google_classroom") == "connected",
        "microsoft": rows.get("microsoft_teams") == "connected",
    }


@router.get("/onboarding-status", response_model=OnboardingStatusResponse)
async def get_onboarding_status(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    connections = await _get_connections(db, user.id)
    return {"has_connection": any(connections.values()), "connections": connections}


@router.post("/onboarding-status", response_model=OnboardingStatusResponse)
async def update_onboarding_status(
    data: OnboardingUpdateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    platform_name = PROVIDER_TO_PLATFORM.get(data.provider)
    if platform_name is None:
        raise HTTPException(status_code=400, detail="Unsupported platform.")

    result = await db.execute(select(Platform).where(Platform.name == platform_name))
    platform = result.scalar_one_or_none()
    if platform is None:
        raise HTTPException(status_code=500, detail=f"Platform '{platform_name}' not seeded.")

    result = await db.execute(
        select(OAuthConnection).where(
            OAuthConnection.user_id == user.id, OAuthConnection.platform_id == platform.id
        )
    )
    connection = result.scalar_one_or_none()

    if data.connected:
        if connection is None:
            # NOTE: ชั่วคราวสำหรับทดสอบ ยังไม่มี OAuth Flow จริง จึงใส่ placeholder token
            connection = OAuthConnection(
                user_id=user.id,
                platform_id=platform.id,
                access_token_enc="TEST_PLACEHOLDER_TOKEN",
                status="connected",
            )
            db.add(connection)
        else:
            connection.status = "connected"
    else:
        if connection is not None:
            await db.delete(connection)

    await db.commit()

    connections = await _get_connections(db, user.id)
    return {"has_connection": any(connections.values()), "connections": connections}