from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from app.api.deps import get_settings_from_app, get_store, require_user
from app.schemas.planner import (
    PlannerAcceptRequest,
    PlannerInviteCreateRequest,
    PlannerMessageRequest,
    PlannerStartRequest,
)
from app.services.planner import PlannerService

router = APIRouter()


def service(store=Depends(get_store), settings=Depends(get_settings_from_app)) -> PlannerService:
    return PlannerService(store=store, settings=settings)


@router.post("/from-trip-creation/{trip_creation_session_id}", status_code=201)
async def create_planner_session(
    trip_creation_session_id: str,
    payload: PlannerStartRequest,
    planner: PlannerService = Depends(service),
    user=Depends(require_user),
):
    return await planner.create_from_trip_creation(trip_creation_session_id, user, payload)


@router.get("/{planner_session_id}")
async def get_planner_session(
    planner_session_id: str,
    planner: PlannerService = Depends(service),
    user=Depends(require_user),
):
    return await planner.snapshot(planner_session_id, user)


@router.post("/{planner_session_id}/messages")
async def send_planner_message(
    planner_session_id: str,
    payload: PlannerMessageRequest,
    planner: PlannerService = Depends(service),
    user=Depends(require_user),
):
    return await planner.send_message(planner_session_id, user, payload)


@router.get("/{planner_session_id}/events")
async def get_planner_events(
    planner_session_id: str,
    after: int = Query(default=0, ge=0),
    stream: bool = Query(default=False),
    planner: PlannerService = Depends(service),
    user=Depends(require_user),
):
    if not stream:
        return {"events": await planner.events(planner_session_id, user, after=after)}

    async def event_stream():
        cursor = after
        for _ in range(30):
            events = await planner.events(planner_session_id, user, after=cursor)
            for event in events:
                cursor = max(cursor, int(event.get("sequence", 0)))
                yield f"event: planner_event\ndata: {json.dumps(event, default=str)}\n\n"
            await asyncio.sleep(1)

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/{planner_session_id}/accept")
async def accept_planner_session(
    planner_session_id: str,
    payload: PlannerAcceptRequest,
    planner: PlannerService = Depends(service),
    user=Depends(require_user),
):
    return await planner.accept(planner_session_id, user, payload)


@router.post("/trip-plans/{trip_plan_id}/invites", status_code=201)
async def create_invite(
    trip_plan_id: str,
    payload: PlannerInviteCreateRequest,
    planner: PlannerService = Depends(service),
    user=Depends(require_user),
):
    return await planner.create_invite(trip_plan_id, user, payload)


@router.get("/invites/{token}")
async def preview_invite(token: str, planner: PlannerService = Depends(service)):
    return await planner.preview_invite(token)


@router.post("/invites/{token}/join")
async def join_invite(token: str, planner: PlannerService = Depends(service), user=Depends(require_user)):
    return await planner.join_invite(token, user)


@router.post("/invites/{invite_id}/revoke")
async def revoke_invite(invite_id: str, planner: PlannerService = Depends(service), user=Depends(require_user)):
    return await planner.revoke_invite(invite_id, user)

