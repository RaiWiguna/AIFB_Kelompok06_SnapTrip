from fastapi import APIRouter

from backend.app.core.config import get_settings
from backend.app.schemas.health import HealthData, HealthResponse


router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    settings = get_settings()
    return HealthResponse(
        data=HealthData(
            status="ok",
            service=settings.app_name,
            environment=settings.app_env,
        )
    )
