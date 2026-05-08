from fastapi import APIRouter, Request

from app.core.errors import error_response

router = APIRouter()


@router.get("/health")
async def api_health(request: Request):
    return {"status": "ok", "service": request.app.state.settings.app_name}


@router.get("/ready")
async def api_ready(request: Request):
    ready_result = await request.app.state.store.ready()
    if not ready_result["ready"]:
        return error_response(503, "not_ready", ready_result["reason"])
    return ready_result
