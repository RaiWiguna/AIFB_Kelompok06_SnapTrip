from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Response

from app.api.deps import get_settings_from_app, get_store, require_user
from app.core.ids import new_id
from app.core.security import (
    hash_password,
    hash_session_token,
    new_session_token,
    normalize_email,
    verify_password,
)
from app.schemas.api import LoginRequest, SignupRequest

router = APIRouter()


def public_user(user: dict):
    return {"id": user["id"], "email": user["email"], "display_name": user["display_name"]}


async def create_session(response: Response, store, settings, user_id: str):
    token = new_session_token()
    token_hash = hash_session_token(token, settings.session_secret)
    await store.save_doc(
        "sessions",
        {
            "id": new_id("sess"),
            "user_id": user_id,
            "token_hash": token_hash,
            "expires_at": datetime.now(UTC) + timedelta(days=14),
            "revoked_at": None,
        },
    )
    response.set_cookie(
        "snaptrip_session",
        token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=14 * 24 * 60 * 60,
    )


@router.post("/signup", status_code=201)
async def signup(
    payload: SignupRequest,
    response: Response,
    store=Depends(get_store),
    settings=Depends(get_settings_from_app),
):
    email = normalize_email(payload.email)
    existing = await store.find_one("users", email=email)
    if existing:
        raise HTTPException(status_code=409, detail="Email is already registered")
    user = await store.save_doc(
        "users",
        {
            "id": new_id("usr"),
            "email": email,
            "display_name": payload.display_name.strip(),
            "password_hash": hash_password(payload.password),
        },
    )
    await create_session(response, store, settings, user["id"])
    return {"user": public_user(user)}


@router.post("/login")
async def login(
    payload: LoginRequest,
    response: Response,
    store=Depends(get_store),
    settings=Depends(get_settings_from_app),
):
    user = await store.find_one("users", email=normalize_email(payload.email))
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    await create_session(response, store, settings, user["id"])
    return {"user": public_user(user)}


@router.post("/logout")
async def logout(response: Response, user=Depends(require_user), store=Depends(get_store)):
    sessions = await store.list_docs("sessions", user_id=user["id"])
    for session in sessions:
        if not session.get("revoked_at"):
            await store.update_doc("sessions", session["id"], {"revoked_at": datetime.now(UTC)})
    response.delete_cookie("snaptrip_session")
    return {"ok": True}


@router.get("/me")
async def me(user=Depends(require_user)):
    return {"user": public_user(user)}
