from datetime import UTC, datetime

from fastapi import Depends, HTTPException, Request

from app.core.config import Settings
from app.core.security import hash_session_token


def get_store(request: Request):
    return request.app.state.store


def get_settings_from_app(request: Request) -> Settings:
    return request.app.state.settings


async def optional_user(
    request: Request,
    store=Depends(get_store),
    settings: Settings = Depends(get_settings_from_app),
):
    token = request.cookies.get("snaptrip_session")
    if not token:
        return None
    token_hash = hash_session_token(token, settings.session_secret)
    session = await store.find_one("sessions", token_hash=token_hash)
    if not session or session.get("revoked_at"):
        return None
    expires_at = session.get("expires_at")
    if expires_at and expires_at < datetime.now(UTC):
        return None
    return await store.find_one("users", id=session["user_id"])


async def require_user(user=Depends(optional_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user
