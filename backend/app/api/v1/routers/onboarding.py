import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.core.database import get_db
from app.models import OAuthConnection, Platform, User
from app.schemas.auth import OnboardingStatusResponse

router = APIRouter(tags=["onboarding"])

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
async def update_onboarding_status():
    """Provider links must be created via OAuth and cannot be toggled directly."""
    raise HTTPException(status_code=405, detail="Use the provider OAuth authorization flow to connect or disconnect an account.")
