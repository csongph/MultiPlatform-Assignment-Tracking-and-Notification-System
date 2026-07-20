from fastapi import APIRouter

from app.api.v1.routers.auth import router as auth_router
from app.api.v1.routers.learning import router as learning_router
from app.api.v1.routers.oauth import router as oauth_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(oauth_router)
api_router.include_router(learning_router)

__all__ = ["api_router"]
