from fastapi import HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError


def error_response(status_code: int, code: str, message: str, request_id: str | None = None):
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": code, "message": message}, "request_id": request_id},
    )


async def http_exception_handler(request: Request, exc: HTTPException):
    code = "http_error"
    if exc.status_code == 401:
        code = "unauthorized"
    elif exc.status_code == 403:
        code = "forbidden"
    elif exc.status_code == 404:
        code = "not_found"
    elif exc.status_code == 409:
        code = "conflict"
    elif exc.status_code == 422:
        code = "validation_error"
    return error_response(exc.status_code, code, str(exc.detail), getattr(request.state, "request_id", None))


async def validation_exception_handler(request: Request, exc: ValidationError):
    return error_response(422, "validation_error", str(exc), getattr(request.state, "request_id", None))


async def validation_request_exception_handler(request: Request, exc: RequestValidationError):
    return error_response(422, "validation_error", str(exc), getattr(request.state, "request_id", None))


async def unhandled_exception_handler(request: Request, exc: Exception):
    return error_response(
        500,
        "internal_error",
        "An unexpected error occurred.",
        getattr(request.state, "request_id", None),
    )
