from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user, get_db
from app.core.config import settings
from app.core.exceptions import AppError
from app.integrations import SUPPORTED_PLATFORMS
from app.models.auth import User
from app.schemas.oauth import AuthorizeUrlResponse, OAuthConnectionOut
from app.services.oauth_service import OAuthOnboardingService, ensure_supported_platform

router = APIRouter(prefix="/oauth", tags=["oauth-onboarding"])


@router.get("/platforms")
async def list_supported_platforms():
    """What platforms can be connected during onboarding."""
    return {"platforms": SUPPORTED_PLATFORMS}


@router.get("/connections", response_model=list[OAuthConnectionOut])
async def list_my_connections(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = OAuthOnboardingService(db)
    connections = await service.list_connections(current_user.id)
    return [
        OAuthConnectionOut(
            id=c.id,
            platform_id=c.platform_id,
            platform_name=c.platform.name,
            status=c.status,
            token_expires_at=c.token_expires_at,
            connected_at=c.connected_at,
        )
        for c in connections
    ]


@router.get("/{platform}/authorize", response_model=AuthorizeUrlResponse)
async def start_authorization(
    platform: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Step 1 of onboarding: frontend calls this (with the logged-in user's
    JWT) to get the URL that the user's browser should be sent to next,
    e.g. `window.location.href = authorization_url`.
    """
    try:
        ensure_supported_platform(platform)
        service = OAuthOnboardingService(db)
        url = service.build_authorization_url(current_user.id, platform)
    except AppError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    return AuthorizeUrlResponse(authorization_url=url)


@router.get("/{platform}/callback")
async def oauth_callback(
    platform: str,
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Step 2 of onboarding: Google/Microsoft redirects the browser here
    directly (no JWT header available at this point — the `state` token
    is what proves which user this belongs to). On success/failure we
    redirect the browser onward to the frontend app.
    """
    service = OAuthOnboardingService(db)
    try:
        await service.handle_callback(platform, code=code, state=state)
    except AppError:
        error_url = f"{settings.FRONTEND_ORIGIN}{settings.FRONTEND_ONBOARDING_ERROR_PATH}?platform={platform}"
        return RedirectResponse(url=error_url, status_code=302)

    success_url = f"{settings.FRONTEND_ORIGIN}{settings.FRONTEND_ONBOARDING_SUCCESS_PATH}?platform={platform}"
    return RedirectResponse(url=success_url, status_code=302)


@router.delete("/{platform}", status_code=204)
async def disconnect_platform(
    platform: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = OAuthOnboardingService(db)
    try:
        await service.disconnect(current_user.id, platform)
    except AppError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
