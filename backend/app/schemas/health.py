from pydantic import BaseModel, Field


class HealthData(BaseModel):
    status: str
    service: str
    environment: str


class HealthResponse(BaseModel):
    data: HealthData
    meta: dict[str, bool] = Field(default_factory=lambda: {"fallback_used": False})
