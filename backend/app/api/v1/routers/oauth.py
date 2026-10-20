import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

from app.api.v1.deps import get_current_user, get_db
from app.core.config import settings
from app.core.exceptions import AppError, ServiceUnavailableError, UnauthorizedError
from app.integrations import SUPPORTED_PLATFORMS
from app.models.auth import User
from app.repositories.oauth_repository import OAuthConnectionRepository
from app.schemas.oauth import AuthorizeUrlResponse, OAuthConnectionOut
from app.services.oauth_service import OAuthOnboardingService, ensure_supported_platform
from app.services.sync_service import SyncService

router = APIRouter(prefix="/oauth", tags=["oauth-onboarding"])

# Frontend (js/onboarding.js) uses short slugs in its URL params and its
# errorMessages map ("google_denied", "microsoft_failed", ...), while the
# backend's Platform rows / adapters use the full names. Keep the mapping
# in one place so the redirect below can't drift from the OAuth adapters.
_PLATFORM_TO_SLUG = {"google_classroom": "google", "microsoft_teams": "microsoft"}


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
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
    error_description: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    """
    Step 2 of onboarding: Google/Microsoft redirects the browser here
    directly (no JWT header available at this point — the `state` token
    is what proves which user this belongs to). On success/failure we
    redirect the browser onward to the frontend app.

    onboarding.js reads `oauth_success` / `oauth_error` / `synced` off this
    redirect's query string directly (see providerLabels / errorMessages in
    js/onboarding.js) — the param names below have to match that exactly.
    """
    provider_slug = _PLATFORM_TO_SLUG.get(platform, platform)

    # Check for error or admin consent required from provider query params
    full_error_str = f"{error or ''} {error_description or ''}".lower()
    is_admin_consent_required = any(
        err in full_error_str
        for err in ("aadsts65001", "aadsts90094", "consent_required", "interaction_required")
    )

    if is_admin_consent_required:
        logger.warning(
            "OAuth admin consent required for platform %s: %s",
            platform,
            error_description or error,
        )
        error_url = (
            f"{settings.FRONTEND_ORIGIN}{settings.FRONTEND_ONBOARDING_ERROR_PATH}"
            f"?oauth_error={provider_slug}_admin_consent_required"
        )
        return RedirectResponse(url=error_url, status_code=302)

    # The user can decline consent on Google/Microsoft's screen, in which
    # case they're redirected back with `error=access_denied` and no `code`
    # at all - handle that before trying to exchange a code that isn't there.
    if error or not code or not state:
        if error:
            logger.warning("OAuth error returned from provider %s: %s", platform, error)
        reason = "denied" if error == "access_denied" else "failed"
        error_url = (
            f"{settings.FRONTEND_ORIGIN}{settings.FRONTEND_ONBOARDING_ERROR_PATH}"
            f"?oauth_error={provider_slug}_{reason}"
        )
        return RedirectResponse(url=error_url, status_code=302)

    service = OAuthOnboardingService(db)
    try:
        connection = await service.handle_callback(platform, code=code, state=state)
    except AppError as exc:
        exc_str = str(exc).lower()
        if any(err in exc_str for err in ("aadsts65001", "aadsts90094", "consent_required", "interaction_required")):
            logger.warning("OAuth admin consent required during token exchange for %s: %s", platform, exc)
            error_url = (
                f"{settings.FRONTEND_ORIGIN}{settings.FRONTEND_ONBOARDING_ERROR_PATH}"
                f"?oauth_error={provider_slug}_admin_consent_required"
            )
            return RedirectResponse(url=error_url, status_code=302)

        logger.error("OAuth callback error for platform %s (%s)", platform, type(exc).__name__)
        if isinstance(exc, UnauthorizedError):
            public_error = "invalid_state"
        elif isinstance(exc, ServiceUnavailableError):
            public_error = f"{provider_slug}_service_unavailable"
        else:
            public_error = f"{provider_slug}_failed"
        error_url = (
            f"{settings.FRONTEND_ORIGIN}{settings.FRONTEND_ONBOARDING_ERROR_PATH}"
            f"?oauth_error={public_error}"
        )
        return RedirectResponse(url=error_url, status_code=302)
    except Exception as exc:
        logger.exception("Unexpected error during OAuth callback for platform %s", platform)
        error_url = (
            f"{settings.FRONTEND_ORIGIN}{settings.FRONTEND_ONBOARDING_ERROR_PATH}"
            f"?oauth_error={provider_slug}_failed"
        )
        return RedirectResponse(url=error_url, status_code=302)

    # Kick off an immediate sync so the user sees their assignments the
    # moment they land back on the dashboard, instead of waiting for the
    # next periodic Celery beat run (every SYNC_INTERVAL_MINUTES).
    # `handle_callback` doesn't eager-load `.platform`, so re-fetch through
    # the repository rather than touching the lazy relationship directly
    # (that would raise MissingGreenlet on the async engine).
    synced_count = 0
    sync_failed = connection is None
    sync_error_reason = "provider_error" if sync_failed else None
    connection = await OAuthConnectionRepository(db).get_by_id_with_platform(connection.id)
    if connection is not None:
        try:
            sync_log = await SyncService(db).sync_connection(connection)
            synced_count = sync_log.items_synced
            # A provider returning no classes is a successful HTTP exchange,
            # but it is not a successful initial import. Surface that result
            # so the user knows the connected account did not provide data.
            sync_failed = sync_log.status == "failed" or bool(
                sync_log.error_detail and sync_log.error_detail.get("info")
            )
            if sync_failed:
                detail = sync_log.error_detail or {}
                info = str(detail.get("info", "")).lower()
                error_detail = str(detail.get("error", "")).lower()
                if "no courses" in info:
                    sync_error_reason = "no_classes"
                elif "no active assignments" in info:
                    sync_error_reason = "no_assignments"
                elif "forbidden (403)" in error_detail:
                    sync_error_reason = "permission_denied"
                elif "401" in error_detail or "tokenexpired" in error_detail:
                    sync_error_reason = "token_expired"
                else:
                    sync_error_reason = "provider_error"
        except Exception as exc:
            # The connection itself succeeded - that's what matters for
            # onboarding. The periodic sync will retry if this failed.
            logger.exception("Initial sync failed after OAuth connection for platform %s (%s)", platform, type(exc).__name__)
            sync_failed = True
            sync_error_reason = "provider_error"

    sync_error_query = (
        f"&sync_error=1&sync_reason={sync_error_reason or 'provider_error'}"
        if sync_failed else ""
    )
    success_url = (
        f"{settings.FRONTEND_ORIGIN}{settings.FRONTEND_ONBOARDING_SUCCESS_PATH}"
        f"?oauth_success={provider_slug}&synced={synced_count}"
        f"{sync_error_query}"
    )
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
