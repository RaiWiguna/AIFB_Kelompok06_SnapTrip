from typing import Any

from pydantic import BaseModel, Field


class ResponseMeta(BaseModel):
    fallback_used: bool = False


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: dict[str, Any] | None = None


class ErrorResponse(BaseModel):
    error: ErrorDetail


class EmptyRequest(BaseModel):
    pass
