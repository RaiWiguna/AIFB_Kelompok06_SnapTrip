from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings
from app.core.errors import (
    error_response,
    http_exception_handler,
    unhandled_exception_handler,
    validation_request_exception_handler,
)
from app.core.middleware import RequestIdMiddleware
from app.db.store import create_store


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    store = create_store(settings)
    await store.connect()
    await store.ensure_indexes()
    await store.seed_destinations()
    app.state.store = store
    app.state.settings = settings
    try:
        yield
    finally:
        await store.close()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name, lifespan=lifespan)
    app.add_middleware(RequestIdMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(api_router, prefix="/api")

    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_request_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)

    @app.get("/health")
    async def health():
        return {"status": "ok", "service": settings.app_name}

    @app.get("/ready")
    async def ready():
        store = app.state.store
        ready_result = await store.ready()
        if not ready_result["ready"]:
            return error_response(503, "not_ready", ready_result["reason"])
        return ready_result

    return app
