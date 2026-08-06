from fastapi import APIRouter

from app.api.v1.routers.admin import router as admin_router
from app.api.v1.routers.auth import router as auth_router
from app.api.v1.routers.auth import me_router
from app.api.v1.routers.learning import router as learning_router
from app.api.v1.routers.onboarding import router as onboarding_router
from app.api.v1.routers.oauth import router as oauth_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(me_router)
api_router.include_router(onboarding_router)
api_router.include_router(oauth_router)
api_router.include_router(learning_router)
api_router.include_router(admin_router)

__all__ = ["api_router"]
