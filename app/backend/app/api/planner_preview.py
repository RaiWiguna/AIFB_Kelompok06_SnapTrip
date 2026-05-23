from fastapi import APIRouter, Depends

from app.api.deps import get_store, require_user
from app.services.planner_preview import planner_preview_display

router = APIRouter()


@router.get("/{session_id}")
async def get_planner_preview(session_id: str, store=Depends(get_store), user=Depends(require_user)):
    return {"preview": await planner_preview_display(store, session_id, user)}
