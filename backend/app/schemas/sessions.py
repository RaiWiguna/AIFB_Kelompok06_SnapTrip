from datetime import datetime

from pydantic import BaseModel

from backend.app.schemas.common import ResponseMeta


class SessionCreateData(BaseModel):
    session_id: str
    status: str
    created_at: datetime


class SessionCreateResponse(BaseModel):
    data: SessionCreateData
    meta: ResponseMeta = ResponseMeta()


class CategoryScore(BaseModel):
    name: str
    confidence: float
    source: str


class SessionStateData(BaseModel):
    session_id: str
    status: str
    detected_categories: list[CategoryScore] = []
    confirmed_categories: list[str] = []
    selected_place_ids: list[str] = []
    latest_itinerary_id: str | None = None


class SessionStateResponse(BaseModel):
    data: SessionStateData
    meta: ResponseMeta = ResponseMeta()
