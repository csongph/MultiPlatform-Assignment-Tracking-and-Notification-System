from fastapi import APIRouter, Depends

from app.api.v1.deps import get_current_user
from app.models import User

router = APIRouter(prefix="/assignments", tags=["assignments"])


@router.get("")
async def list_assignments(user: User = Depends(get_current_user)):
    # TODO: ต่อกับ Sync Engine จริงในลำดับถัดไป — ตอนนี้คืน List ว่างเพื่อให้ Dashboard โหลดได้ก่อน
    return {"assignments": []}