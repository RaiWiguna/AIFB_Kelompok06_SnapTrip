from __future__ import annotations

import json
import re
import secrets
from datetime import UTC, date, datetime, timedelta
from typing import Any

from fastapi import HTTPException

from app.core.categories import validate_categories
from app.core.ids import new_id
from app.providers.google_places import GooglePlacesProvider
from app.schemas.planner import (
    BudgetConstraint,
    BudgetPlanDocumentV1,
    FullItineraryDocumentV1,
    PlannerAcceptRequest,
    PlannerInviteCreateRequest,
    PlannerMessageRequest,
    PlannerStartRequest,
    TripMemoDocumentV1,
)
from app.services.trip_detail import (
    destination_from_recommendation,
    format_idr,
    synthesize_budget_categories,
    synthesize_budget_daily,
    synthesize_gallery,
    synthesize_itinerary,
    synthesize_memo,
)

PLANNER_DOCUMENT_TYPES = ("trip_memo", "full_itinerary", "budget_plan")
MAX_AGENT_TURNS = 8
MAX_TOOL_CALLS = 12
BUDGET_ALLOCATION_WEIGHTS = {
    "accommodation": 0.35,
    "transport": 0.20,
    "meals": 0.18,
    "activities": 0.20,
    "other": 0.07,
}
BUDGET_LABELS = {
    "accommodation": "Accommodation",
    "transport": "Transport",
    "meals": "Meals",
    "activities": "Activities & Tickets",
    "other": "Other",
}


def now() -> datetime:
    return datetime.now(UTC)


def duration_days(start: date, end: date) -> int:
    return (end - start).days + 1


def iso_date(value: date | str) -> str:
    return value if isinstance(value, str) else value.isoformat()


class PlannerService:
    def __init__(self, *, store, settings):
        self.store = store
        self.settings = settings
        self.places = GooglePlacesProvider(settings)

    async def create_from_trip_creation(
        self,
        trip_creation_session_id: str,
        user: dict[str, Any],
        payload: PlannerStartRequest,
    ) -> dict[str, Any]:
        creation = await self._owned_trip_creation(trip_creation_session_id, user)
        item = await self._owned_recommendation_item(payload.recommendation_item_id, creation, user)
        selected_ids = list(creation.get("selected_recommendation_ids") or [])
        if selected_ids != [item["id"]]:
            creation = await self.store.update_doc(
                "tripCreationSessions",
                creation["id"],
                {
                    "selected_recommendation_ids": [item["id"]],
                    "status": "recommendations_selected",
                    "travel_start_date": iso_date(payload.travel_start_date),
                    "travel_end_date": iso_date(payload.travel_end_date),
                    "duration_days": payload.duration_days,
                    "traveler_count": payload.traveler_count,
                },
            )
        else:
            creation = await self.store.update_doc(
                "tripCreationSessions",
                creation["id"],
                {
                    "travel_start_date": iso_date(payload.travel_start_date),
                    "travel_end_date": iso_date(payload.travel_end_date),
                    "duration_days": payload.duration_days,
                    "traveler_count": payload.traveler_count,
                },
            )

        existing = await self.store.find_one(
            "plannerSessions",
            owner_id=user["id"],
            trip_creation_session_id=creation["id"],
        )
        if existing:
            return await self.snapshot(existing["id"], user)

        planner = await self.store.save_doc(
            "plannerSessions",
            {
                "id": new_id("pls"),
                "owner_id": user["id"],
                "trip_creation_session_id": creation["id"],
                "selected_recommendation_id": item["id"],
                "selected_destination_name": item.get("name"),
                "travel_start_date": iso_date(payload.travel_start_date),
                "travel_end_date": iso_date(payload.travel_end_date),
                "duration_days": payload.duration_days,
                "traveler_count": payload.traveler_count,
                "status": "idle",
                "active_run_id": None,
                "context_summary": empty_context_summary(),
                "constraints": {},
                "latest_document_ids": {},
                "ready": False,
                "accepted_trip_plan_id": None,
            },
        )
        await self._emit_event(planner["id"], "session_created", "Created planner session", payload={})
        prompt = f"Plan me a {payload.duration_days} day {item.get('name')} trip for {payload.traveler_count} people."
        await self._append_message(planner["id"], "user", prompt, visible=True, run_id=None)
        await self._run_agent(planner, prompt, trigger="auto_initial")
        return await self.snapshot(planner["id"], user)

    async def snapshot(self, planner_session_id: str, user: dict[str, Any]) -> dict[str, Any]:
        session = await self._owned_planner_session(planner_session_id, user)
        messages = await self._ordered("plannerMessages", planner_session_id=planner_session_id)
        events = await self._ordered("plannerEvents", planner_session_id=planner_session_id)
        documents = await self._latest_documents(planner_session_id)
        creation = await self.store.find_one("tripCreationSessions", id=session["trip_creation_session_id"])
        item = await self.store.find_one("recommendationItems", id=session["selected_recommendation_id"])
        destinations = [destination_from_recommendation(item, 1)] if item else []
        memo = documents.get("trip_memo")
        itinerary = documents.get("full_itinerary")
        budget = documents.get("budget_plan")
        gallery = synthesize_gallery({"title": session.get("selected_destination_name")}, destinations)
        return {
            "session": {
                **session,
                "messages": [message for message in messages if message.get("visible", True)],
                "events": events,
                "documents": {
                    "trip_memo": memo,
                    "full_itinerary": itinerary,
                    "budget_plan": budget,
                },
                "display": {
                    "title": self._title(session),
                    "categories": validate_categories(list((creation or {}).get("confirmed_categories") or item_categories(item))),
                    "destinations": destinations,
                    "memo": memo["content"] if memo else empty_memo(),
                    "itinerary": (itinerary["content"] or {}).get("days", []) if itinerary else [],
                    "budget": budget["content"] if budget else empty_budget(),
                    "gallery": gallery,
                    "acceptance": self._acceptance_state(session, documents),
                },
            }
        }

    async def send_message(self, planner_session_id: str, user: dict[str, Any], payload: PlannerMessageRequest):
        session = await self._owned_planner_session(planner_session_id, user)
        if session.get("status") == "working":
            await self._append_message(planner_session_id, "user", payload.text, visible=True, run_id=None, queued=True)
            await self._emit_event(planner_session_id, "message_queued", "Queued follow-up message", payload={})
            return await self.snapshot(planner_session_id, user)
        await self._append_message(planner_session_id, "user", payload.text, visible=True, run_id=None)
        await self._run_agent(session, payload.text, trigger="user_message")
        return await self.snapshot(planner_session_id, user)

    async def events(self, planner_session_id: str, user: dict[str, Any], after: int = 0) -> list[dict[str, Any]]:
        await self._owned_planner_session(planner_session_id, user)
        events = await self._ordered("plannerEvents", planner_session_id=planner_session_id)
        return [event for event in events if int(event.get("sequence", 0)) > after]

    async def accept(self, planner_session_id: str, user: dict[str, Any], payload: PlannerAcceptRequest):
        session = await self._owned_planner_session(planner_session_id, user)
        documents = await self._latest_documents(planner_session_id)
        validation = validate_document_set(documents)
        if not validation["valid"]:
            raise HTTPException(status_code=422, detail=f"Planner documents are incomplete: {', '.join(validation['missing'])}")
        if session.get("accepted_trip_plan_id"):
            plan = await self.store.find_one("tripPlans", id=session["accepted_trip_plan_id"], owner_id=user["id"])
            if plan:
                return {"trip_plan": plan}

        item = await self.store.find_one("recommendationItems", id=session["selected_recommendation_id"])
        memo = documents["trip_memo"]["content"]
        itinerary = documents["full_itinerary"]["content"]["days"]
        budget = documents["budget_plan"]["content"]
        categories = item_categories(item)
        estimated_budget = budget.get("estimated_total_idr")
        plan = await self.store.save_doc(
            "tripPlans",
            {
                "id": new_id("trip"),
                "owner_id": user["id"],
                "title": self._title(session),
                "description": memo.get("caption"),
                "status": "accepted",
                "visibility": payload.visibility,
                "categories": categories,
                "duration_days": session.get("duration_days"),
                "estimated_budget_idr": estimated_budget,
                "budget_total_label": budget.get("total_amount"),
                "cover_image_id": None,
                "region": (item or {}).get("region", "Indonesia"),
                "trip_creation_session_id": session["trip_creation_session_id"],
                "planner_session_id": session["id"],
                "selected_recommendation_ids": [session["selected_recommendation_id"]],
                "travel_start_date": session["travel_start_date"],
                "travel_end_date": session["travel_end_date"],
                "travelers": str(session["traveler_count"]),
                "memo": memo,
                "itinerary": itinerary,
                "budget_categories": budget.get("categories", []),
                "budget_daily": budget.get("daily", []),
                "gallery": synthesize_gallery({"title": self._title(session)}, [destination_from_recommendation(item, 1)] if item else []),
            },
        )
        await self.store.save_doc(
            "tripParticipants",
            {
                "id": new_id("par"),
                "trip_plan_id": plan["id"],
                "user_id": user["id"],
                "role": "owner",
                "status": "active",
                "joined_at": now(),
            },
        )
        await self.store.update_doc(
            "plannerSessions",
            session["id"],
            {"status": "accepted", "accepted_trip_plan_id": plan["id"]},
        )
        await self._emit_event(session["id"], "run_completed", "Accepted Trip Plan", payload={"trip_plan_id": plan["id"]})
        return {"trip_plan": plan}

    async def create_invite(self, trip_plan_id: str, user: dict[str, Any], payload: PlannerInviteCreateRequest):
        plan = await self.store.find_one("tripPlans", id=trip_plan_id, owner_id=user["id"])
        if not plan or plan.get("status") != "accepted":
            raise HTTPException(status_code=404, detail="Trip Plan not found")
        token = secrets.token_urlsafe(24)
        invite = await self.store.save_doc(
            "shareInvites",
            {
                "id": new_id("inv"),
                "trip_plan_id": trip_plan_id,
                "owner_id": user["id"],
                "token": token,
                "status": "active",
                "expires_at": now() + timedelta(days=payload.expires_days),
                "created_at": now(),
            },
        )
        return {"invite": invite}

    async def preview_invite(self, token: str):
        invite = await self.store.find_one("shareInvites", token=token, status="active")
        if not invite or invite.get("expires_at") < now():
            raise HTTPException(status_code=404, detail="Invite not found")
        plan = await self.store.find_one("tripPlans", id=invite["trip_plan_id"])
        if not plan:
            raise HTTPException(status_code=404, detail="Invite not found")
        return {"invite": invite, "trip_plan": plan}

    async def join_invite(self, token: str, user: dict[str, Any]):
        preview = await self.preview_invite(token)
        plan = preview["trip_plan"]
        existing = await self.store.find_one("tripParticipants", trip_plan_id=plan["id"], user_id=user["id"])
        if existing:
            return {"participant": existing, "trip_plan": plan}
        participant = await self.store.save_doc(
            "tripParticipants",
            {
                "id": new_id("par"),
                "trip_plan_id": plan["id"],
                "user_id": user["id"],
                "role": "viewer",
                "status": "active",
                "joined_at": now(),
            },
        )
        return {"participant": participant, "trip_plan": plan}

    async def revoke_invite(self, invite_id: str, user: dict[str, Any]):
        invite = await self.store.find_one("shareInvites", id=invite_id, owner_id=user["id"])
        if not invite:
            raise HTTPException(status_code=404, detail="Invite not found")
        updated = await self.store.update_doc("shareInvites", invite_id, {"status": "revoked"})
        return {"invite": updated}

    async def _run_agent(self, session: dict[str, Any], user_text: str, *, trigger: str) -> None:
        run = await self.store.save_doc(
            "plannerRuns",
            {
                "id": new_id("run"),
                "planner_session_id": session["id"],
                "owner_id": session["owner_id"],
                "trigger": trigger,
                "status": "running",
                "turn_count": 0,
                "tool_count": 0,
                "stop_reason": None,
                "token_usage": {},
                "created_at": now(),
            },
        )
        await self.store.update_doc("plannerSessions", session["id"], {"status": "working", "active_run_id": run["id"]})
        await self._emit_event(session["id"], "run_started", "Started planner run", run_id=run["id"], payload={"trigger": trigger})
        turn_count = 0
        tool_count = 0
        try:
            while turn_count < MAX_AGENT_TURNS and tool_count < MAX_TOOL_CALLS:
                turn_count += 1
                await self._emit_event(session["id"], "turn_started", f"Reasoning turn {turn_count}", run_id=run["id"], payload={})
                actions = self._plan_actions(user_text, session=session, trigger=trigger, turn_count=turn_count)
                if not actions:
                    await self._assistant_response(session["id"], run["id"], self._direct_response(user_text))
                    break
                for action in actions:
                    tool_count += 1
                    if tool_count > MAX_TOOL_CALLS:
                        break
                    await self._execute_tool(session["id"], run["id"], action)
                await self._assistant_response(session["id"], run["id"], self._summary_response(actions))
                break
            documents = await self._latest_documents(session["id"])
            validation = validate_document_set(documents)
            status = "ready_to_review" if validation["valid"] else "needs_input"
            await self.store.update_doc(
                "plannerSessions",
                session["id"],
                {
                    "status": status,
                    "active_run_id": None,
                    "ready": validation["valid"],
                    "context_summary": await self._compact_context(session["id"]),
                },
            )
            await self.store.update_doc(
                "plannerRuns",
                run["id"],
                {"status": "completed", "turn_count": turn_count, "tool_count": tool_count, "stop_reason": status},
            )
            await self._emit_event(
                session["id"],
                "run_completed",
                "Planner run completed",
                run_id=run["id"],
                payload={"status": status, "validation": validation},
            )
        except Exception as exc:
            await self.store.update_doc("plannerSessions", session["id"], {"status": "interrupted", "active_run_id": None})
            await self.store.update_doc(
                "plannerRuns",
                run["id"],
                {"status": "failed", "turn_count": turn_count, "tool_count": tool_count, "stop_reason": "error"},
            )
            await self._emit_event(
                session["id"],
                "run_failed",
                "Planner run failed",
                status="error",
                run_id=run["id"],
                payload={"error_class": exc.__class__.__name__, "safe_message": "Planner run failed"},
            )
            raise

    def _plan_actions(self, user_text: str, *, session: dict[str, Any], trigger: str, turn_count: int) -> list[dict[str, Any]]:
        text = user_text.lower()
        if trigger == "auto_initial":
            return [
                {"tool": "read_trip_context", "args": {}},
                {"tool": "grounded_web_research", "args": {"query": "current accommodation and transport cost estimates"}},
                {"tool": "replace_trip_memo", "args": {}},
                {"tool": "replace_full_itinerary", "args": {}},
                {"tool": "replace_budget_plan", "args": {}},
                {"tool": "validate_documents", "args": {}},
            ]
        if "add" in text or "tambah" in text or "destination" in text or "destinasi" in text:
            return [
                {"tool": "places_text_search", "args": {"query": user_text}},
                {"tool": "places_details", "args": {}},
                {"tool": "grounded_web_research", "args": {"query": user_text}},
                {"tool": "patch_itinerary_day", "args": {"intent": user_text}},
                {"tool": "patch_budget_category", "args": {"intent": user_text}},
                {"tool": "patch_memo_section", "args": {"intent": user_text}},
                {"tool": "validate_documents", "args": {}},
            ]
        if budget_request_is_ambiguous(user_text):
            return [
                {
                    "tool": "request_clarification",
                    "args": {
                        "reason": "budget_scope_ambiguous",
                        "question": "Is that budget for the whole trip, per person, or per day?",
                    },
                }
            ]
        budget_constraint = parse_budget_constraint(user_text, int(session.get("traveler_count") or 1))
        if budget_constraint or "budget" in text or "biaya" in text or "cheap" in text or "murah" in text:
            args = {"intent": user_text}
            if budget_constraint:
                args["budget_constraint"] = budget_constraint.model_dump()
            return [
                {"tool": "grounded_web_research", "args": {"query": user_text}},
                {"tool": "patch_budget_category", "args": args},
                {"tool": "validate_documents", "args": {}},
            ]
        if "day" in text or "hari" in text or "duration" in text or "durasi" in text:
            return [
                {"tool": "patch_itinerary_day", "args": {"intent": user_text}},
                {"tool": "patch_budget_category", "args": {"intent": user_text}},
                {"tool": "validate_documents", "args": {}},
            ]
        return []

    async def _execute_tool(self, planner_session_id: str, run_id: str, action: dict[str, Any]) -> None:
        tool = action["tool"]
        label = tool_label(tool)
        await self._emit_event(planner_session_id, "tool_started", label, run_id=run_id, payload={"tool": tool})
        try:
            if tool == "read_trip_context":
                result = await self._read_trip_context(planner_session_id)
            elif tool == "read_documents":
                result = {"documents": await self._latest_documents(planner_session_id)}
            elif tool == "replace_trip_memo":
                result = await self._replace_trip_memo(planner_session_id, run_id)
            elif tool == "replace_full_itinerary":
                result = await self._replace_full_itinerary(planner_session_id, run_id)
            elif tool == "replace_budget_plan":
                result = await self._replace_budget_plan(planner_session_id, run_id)
            elif tool == "patch_itinerary_day":
                result = await self._patch_itinerary(planner_session_id, run_id, action.get("args", {}))
            elif tool == "patch_budget_category":
                result = await self._patch_budget(planner_session_id, run_id, action.get("args", {}))
            elif tool == "patch_memo_section":
                result = await self._patch_memo(planner_session_id, run_id, action.get("args", {}))
            elif tool == "places_text_search":
                result = await self._places_text_search(planner_session_id, action.get("args", {}))
            elif tool == "places_details":
                result = await self._places_details(planner_session_id)
            elif tool == "grounded_web_research":
                result = await self._grounded_research(planner_session_id, action.get("args", {}))
            elif tool == "validate_documents":
                result = validate_document_set(await self._latest_documents(planner_session_id))
                event = "document_validation_started" if result["valid"] else "document_validation_failed"
                await self._emit_event(planner_session_id, event, "Validated planner documents", run_id=run_id, payload=result)
            elif tool == "compute_budget_summary":
                result = await self._compute_budget_summary(planner_session_id)
            elif tool == "request_clarification":
                result = {
                    "needs_user_input": True,
                    "question": action.get("args", {}).get("question") or "Can you clarify the request?",
                    "reason": action.get("args", {}).get("reason") or "clarification_needed",
                }
            else:
                result = {"ok": True}
            await self._append_message(planner_session_id, "tool", json.dumps({"tool": tool, "result": result}, default=str), visible=False, run_id=run_id)
            await self._emit_event(planner_session_id, "tool_completed", label, run_id=run_id, payload={"tool": tool})
        except Exception as exc:
            await self._emit_event(
                planner_session_id,
                "tool_failed",
                label,
                status="error",
                run_id=run_id,
                payload={"tool": tool, "error_class": exc.__class__.__name__},
            )
            raise

    async def _replace_trip_memo(self, planner_session_id: str, run_id: str) -> dict[str, Any]:
        context = await self._read_trip_context(planner_session_id)
        memo = synthesize_memo(context["plan"], context["destinations"])
        return await self._commit_document(planner_session_id, run_id, "trip_memo", "trip_memo.v1", TripMemoDocumentV1.model_validate(memo).model_dump())

    async def _replace_full_itinerary(self, planner_session_id: str, run_id: str) -> dict[str, Any]:
        context = await self._read_trip_context(planner_session_id)
        days = synthesize_itinerary(expand_destinations_for_duration(context["destinations"], context["session"]["duration_days"]))
        for idx, day in enumerate(days, start=0):
            day["dateLabel"] = date_label(context["session"]["travel_start_date"], idx)
        document = FullItineraryDocumentV1.model_validate({"days": days}).model_dump(by_alias=True)
        return await self._commit_document(planner_session_id, run_id, "full_itinerary", "full_itinerary.v1", document)

    async def _replace_budget_plan(self, planner_session_id: str, run_id: str) -> dict[str, Any]:
        context = await self._read_trip_context(planner_session_id)
        items = [context["recommendation_item"]] if context.get("recommendation_item") else []
        destinations = expand_destinations_for_duration(context["destinations"], context["session"]["duration_days"])
        total = estimate_total_idr(items, context["session"]["duration_days"], context["session"]["traveler_count"])
        plan = {**context["plan"], "estimated_budget_idr": total}
        categories = synthesize_budget_categories(plan, items, destinations)
        daily = synthesize_budget_daily(items, destinations)
        document = BudgetPlanDocumentV1.model_validate(
            {
                "categories": categories,
                "daily": daily,
                "total_amount": format_idr(total),
                "total_label": f"for {context['session']['traveler_count']} people - {context['session']['duration_days']} days",
                "estimated_total_idr": total,
                "per_person_idr": round(total / max(context["session"]["traveler_count"], 1)),
            }
        ).model_dump()
        document = normalize_budget_content(
            document,
            traveler_count=int(context["session"]["traveler_count"]),
            duration_days=int(context["session"]["duration_days"]),
        )
        return await self._commit_document(planner_session_id, run_id, "budget_plan", "budget_plan.v1", document)

    async def _patch_itinerary(self, planner_session_id: str, run_id: str, args: dict[str, Any]) -> dict[str, Any]:
        documents = await self._latest_documents(planner_session_id)
        if "full_itinerary" not in documents:
            return await self._replace_full_itinerary(planner_session_id, run_id)
        content = documents["full_itinerary"]["content"]
        days = list(content.get("days") or [])
        next_day = len(days) + 1
        days.append(
            {
                "day": next_day,
                "title": "Added destination research",
                "summary": "Extra stop added from the chat request.",
                "description": args.get("intent") or "Added from chat request.",
                "cover": "/landing/indonesia-map.png",
                "dateLabel": f"Day {next_day}",
                "highlights": ["Added by agent", "Estimate"],
                "activities": [
                    {
                        "time": "10:00",
                        "title": "Explore added stop",
                        "detail": args.get("intent") or "Confirm details before departure.",
                        "location": "Indonesia",
                        "duration": "3h",
                    }
                ],
                "transport": {"mode": "Drive", "from": "Previous stop", "to": "Added stop", "durationLabel": "Estimate"},
                "accommodation": {"name": "Local stay to confirm", "area": "Indonesia", "nights": 1},
                "meals": {"lunch": "Local restaurant to confirm"},
                "estCost": {"value": "Budget updated", "note": "estimate"},
            }
        )
        document = FullItineraryDocumentV1.model_validate({"days": days}).model_dump(by_alias=True)
        return await self._commit_document(planner_session_id, run_id, "full_itinerary", "full_itinerary.v1", document)

    async def _patch_budget(self, planner_session_id: str, run_id: str, args: dict[str, Any]) -> dict[str, Any]:
        documents = await self._latest_documents(planner_session_id)
        if "budget_plan" not in documents:
            return await self._replace_budget_plan(planner_session_id, run_id)
        session = await self.store.find_one("plannerSessions", id=planner_session_id)
        traveler_count = int((session or {}).get("traveler_count") or 1)
        duration = int((session or {}).get("duration_days") or 1)
        content = documents["budget_plan"]["content"]
        total = int(content.get("estimated_total_idr") or 0) or 500_000
        intent = (args.get("intent") or "").lower()
        constraint = None
        if args.get("budget_constraint"):
            constraint = BudgetConstraint.model_validate(args["budget_constraint"])
        elif parsed := parse_budget_constraint(args.get("intent") or "", traveler_count):
            constraint = parsed
        if constraint:
            content = normalize_budget_content(
                content,
                traveler_count=traveler_count,
                duration_days=duration,
                constraint=constraint,
            )
        elif "cheap" in intent or "murah" in intent or "cap" in intent or "under" in intent:
            total = round(total * 0.85)
            content = normalize_budget_content(
                {**content, "estimated_total_idr": total, "budget_constraint": None},
                traveler_count=traveler_count,
                duration_days=duration,
            )
        else:
            total = round(total * 1.12)
            content = normalize_budget_content(
                {**content, "estimated_total_idr": total, "budget_constraint": None},
                traveler_count=traveler_count,
                duration_days=duration,
            )
        document = BudgetPlanDocumentV1.model_validate(content).model_dump()
        return await self._commit_document(planner_session_id, run_id, "budget_plan", "budget_plan.v1", document)

    async def _patch_memo(self, planner_session_id: str, run_id: str, args: dict[str, Any]) -> dict[str, Any]:
        documents = await self._latest_documents(planner_session_id)
        if "trip_memo" not in documents:
            return await self._replace_trip_memo(planner_session_id, run_id)
        content = documents["trip_memo"]["content"]
        note = args.get("intent") or "Updated from chat request."
        content["markdown"] = f"{content['markdown']}\n\n### Latest adjustment\n\n- {note}"
        content["items"] = int(content.get("items") or 1) + 1
        document = TripMemoDocumentV1.model_validate(content).model_dump()
        return await self._commit_document(planner_session_id, run_id, "trip_memo", "trip_memo.v1", document)

    async def _places_text_search(self, planner_session_id: str, args: dict[str, Any]) -> dict[str, Any]:
        query = args.get("query") or "Indonesia destination"
        fact = await self.store.save_doc(
            "plannerResearchFacts",
            {
                "id": new_id("fact"),
                "planner_session_id": planner_session_id,
                "kind": "places_text_search",
                "query": query,
                "summary": f"Places Text Search candidate for: {query}",
                "citations": [],
                "provider_place_id": None,
                "created_at": now(),
            },
        )
        return {"fact_id": fact["id"], "summary": fact["summary"]}

    async def _places_details(self, planner_session_id: str) -> dict[str, Any]:
        fact = await self.store.save_doc(
            "plannerResearchFacts",
            {
                "id": new_id("fact"),
                "planner_session_id": planner_session_id,
                "kind": "places_details",
                "summary": "Place details stored for planner context. Provider disabled local runs use fallback details.",
                "citations": [],
                "created_at": now(),
            },
        )
        return {"fact_id": fact["id"], "summary": fact["summary"]}

    async def _grounded_research(self, planner_session_id: str, args: dict[str, Any]) -> dict[str, Any]:
        query = args.get("query") or "trip cost estimates Indonesia"
        fact = await self.store.save_doc(
            "plannerResearchFacts",
            {
                "id": new_id("fact"),
                "planner_session_id": planner_session_id,
                "kind": "grounded_web_research",
                "query": query,
                "summary": "Current accommodation, ticket, and transport values should be treated as estimates.",
                "citations": [{"title": "Gemini Google Search grounding", "url": "https://ai.google.dev/gemini-api/docs/google-search"}],
                "created_at": now(),
            },
        )
        return {"fact_id": fact["id"], "summary": fact["summary"], "citation_count": 1}

    async def _compute_budget_summary(self, planner_session_id: str) -> dict[str, Any]:
        documents = await self._latest_documents(planner_session_id)
        budget = documents.get("budget_plan", {}).get("content") or {}
        return {
            "total_amount": budget.get("total_amount"),
            "per_person_idr": budget.get("per_person_idr"),
            "category_count": len(budget.get("categories") or []),
        }

    async def _commit_document(
        self,
        planner_session_id: str,
        run_id: str,
        document_type: str,
        schema_version: str,
        content: dict[str, Any],
    ) -> dict[str, Any]:
        await self._emit_event(planner_session_id, "document_validation_started", f"Validating {document_title(document_type)}", run_id=run_id, payload={"document_type": document_type})
        previous = await self.store.find_one("plannerDocuments", planner_session_id=planner_session_id, document_type=document_type)
        version = int((previous or {}).get("version") or 0) + 1
        doc_id = previous["id"] if previous else new_id("doc")
        document = await self.store.save_doc(
            "plannerDocuments",
            {
                "id": doc_id,
                "planner_session_id": planner_session_id,
                "document_type": document_type,
                "schema_version": schema_version,
                "version": version,
                "valid": True,
                "content": content,
            },
        )
        await self.store.save_doc(
            "plannerDocumentVersions",
            {
                "id": new_id("dver"),
                "planner_session_id": planner_session_id,
                "document_id": doc_id,
                "document_type": document_type,
                "schema_version": schema_version,
                "version": version,
                "valid": True,
                "content": content,
                "run_id": run_id,
            },
        )
        session = await self.store.find_one("plannerSessions", id=planner_session_id)
        latest = dict((session or {}).get("latest_document_ids") or {})
        latest[document_type] = doc_id
        await self.store.update_doc("plannerSessions", planner_session_id, {"latest_document_ids": latest})
        await self._emit_event(
            planner_session_id,
            "document_committed",
            f"Updated {document_title(document_type)}",
            run_id=run_id,
            payload={"document_type": document_type, "version": version},
        )
        return {"document_id": document["id"], "document_type": document_type, "version": version}

    async def _assistant_response(self, planner_session_id: str, run_id: str, text: str) -> None:
        await self._emit_event(planner_session_id, "assistant_message_started", "Writing response", run_id=run_id, payload={})
        await self._emit_event(planner_session_id, "assistant_message_delta", "Response update", run_id=run_id, payload={"delta": text})
        await self._append_message(planner_session_id, "assistant", text, visible=True, run_id=run_id)
        await self._emit_event(planner_session_id, "assistant_message_completed", "Response completed", run_id=run_id, payload={})

    async def _read_trip_context(self, planner_session_id: str) -> dict[str, Any]:
        session = await self.store.find_one("plannerSessions", id=planner_session_id)
        item = await self.store.find_one("recommendationItems", id=session["selected_recommendation_id"])
        destination = destination_from_recommendation(item, 1) if item else {
            "order": 1,
            "name": session.get("selected_destination_name") or "Selected destination",
            "region": "Indonesia",
            "cover": "/landing/indonesia-map.png",
            "blurb": "Selected destination.",
            "highlights": ["Selected"],
            "pin": {"x": 50, "y": 50},
            "days": [1],
        }
        plan = {
            "id": planner_session_id,
            "title": self._title(session),
            "owner_id": session["owner_id"],
            "categories": item_categories(item),
            "duration_days": session["duration_days"],
            "estimated_budget_idr": (item.get("estimated_cost") or {}).get("amount_idr") if item else None,
        }
        return {
            "session": session,
            "recommendation_item": item,
            "destinations": [destination],
            "plan": plan,
        }

    async def _latest_documents(self, planner_session_id: str) -> dict[str, dict[str, Any]]:
        docs = await self.store.list_docs("plannerDocuments", planner_session_id=planner_session_id)
        latest = {}
        for doc in sorted(docs, key=lambda item: item.get("version", 0)):
            latest[doc["document_type"]] = doc
        return latest

    async def _append_message(
        self,
        planner_session_id: str,
        role: str,
        content: str,
        *,
        visible: bool,
        run_id: str | None,
        queued: bool = False,
    ) -> dict[str, Any]:
        sequence = await self._next_sequence("plannerMessages", planner_session_id)
        return await self.store.save_doc(
            "plannerMessages",
            {
                "id": new_id("msg"),
                "planner_session_id": planner_session_id,
                "run_id": run_id,
                "sequence": sequence,
                "role": role,
                "content": content,
                "visible": visible,
                "queued": queued,
                "created_at": now(),
            },
        )

    async def _emit_event(
        self,
        planner_session_id: str,
        event_type: str,
        label: str,
        *,
        status: str = "ok",
        run_id: str | None = None,
        payload: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        sequence = await self._next_sequence("plannerEvents", planner_session_id)
        return await self.store.save_doc(
            "plannerEvents",
            {
                "id": new_id("evt"),
                "planner_session_id": planner_session_id,
                "run_id": run_id,
                "sequence": sequence,
                "type": event_type,
                "label": label,
                "status": status,
                "payload": sanitize_payload(payload or {}),
                "created_at": now(),
            },
        )

    async def _next_sequence(self, collection: str, planner_session_id: str) -> int:
        docs = await self.store.list_docs(collection, planner_session_id=planner_session_id)
        if not docs:
            return 1
        return max(int(doc.get("sequence", 0)) for doc in docs) + 1

    async def _ordered(self, collection: str, **criteria) -> list[dict[str, Any]]:
        docs = await self.store.list_docs(collection, **criteria)
        return sorted(docs, key=lambda doc: int(doc.get("sequence", 0)))

    async def _compact_context(self, planner_session_id: str) -> dict[str, Any]:
        await self._emit_event(planner_session_id, "context_compaction_started", "Compacting planner context", payload={})
        messages = await self._ordered("plannerMessages", planner_session_id=planner_session_id)
        facts = await self.store.list_docs("plannerResearchFacts", planner_session_id=planner_session_id)
        summary = {
            "conversation_summary": " ".join(message["content"] for message in messages[-4:] if message.get("visible", True))[:1000],
            "decision_log": ["Generated structured planner documents from selected destination context."],
            "open_questions": [],
            "constraints": {},
            "research_facts_summary": [fact.get("summary") for fact in facts[-5:]],
            "document_change_summary": "Latest valid documents are preserved as canonical planner state.",
        }
        await self._emit_event(planner_session_id, "context_compaction_completed", "Compacted planner context", payload={})
        return summary

    async def _owned_trip_creation(self, session_id: str, user: dict[str, Any]) -> dict[str, Any]:
        session = await self.store.find_one("tripCreationSessions", id=session_id)
        if not session or session.get("owner_id") != user["id"]:
            raise HTTPException(status_code=404, detail="Trip creation session not found")
        return session

    async def _owned_recommendation_item(self, item_id: str, creation: dict[str, Any], user: dict[str, Any]) -> dict[str, Any]:
        item = await self.store.find_one("recommendationItems", id=item_id)
        if not item or item.get("owner_id") != user["id"] or item.get("session_id") != creation["id"]:
            raise HTTPException(status_code=422, detail="Selected destination is no longer available")
        return item

    async def _owned_planner_session(self, planner_session_id: str, user: dict[str, Any]) -> dict[str, Any]:
        session = await self.store.find_one("plannerSessions", id=planner_session_id)
        if not session or session.get("owner_id") != user["id"]:
            raise HTTPException(status_code=404, detail="Planner session not found")
        return session

    def _title(self, session: dict[str, Any]) -> str:
        return f"{session.get('selected_destination_name') or 'Selected destination'} trip"

    def _acceptance_state(self, session: dict[str, Any], documents: dict[str, Any]) -> dict[str, Any]:
        validation = validate_document_set(documents)
        return {
            "enabled": validation["valid"] and session.get("status") in {"ready_to_review", "accepted"},
            "reason": "Planner documents are ready." if validation["valid"] else f"Missing: {', '.join(validation['missing'])}",
            "validation": validation,
        }

    def _direct_response(self, user_text: str) -> str:
        return f"I noted that. The current planner documents stay unchanged because this message does not require a structured edit: {user_text}"

    def _summary_response(self, actions: list[dict[str, Any]]) -> str:
        tools = {action["tool"] for action in actions}
        if "request_clarification" in tools:
            for action in actions:
                if action["tool"] == "request_clarification":
                    return action.get("args", {}).get("question") or "I need one clarification before changing the plan."
            return "I need one clarification before changing the plan."
        if {"replace_trip_memo", "replace_full_itinerary", "replace_budget_plan"}.issubset(tools):
            return "I drafted the trip memo, full itinerary, and budget plan from your selected destination, dates, and group size."
        if "places_text_search" in tools:
            return "I researched the added destination, updated the itinerary, adjusted the budget, and added a memo note."
        if "patch_budget_category" in tools:
            return "I updated the budget constraint, recalculated totals, and kept the structured documents valid."
        return "I updated the planner documents and validated the latest draft."


def validate_document_set(documents: dict[str, Any]) -> dict[str, Any]:
    missing = [doc_type for doc_type in PLANNER_DOCUMENT_TYPES if doc_type not in documents]
    invalid = [doc_type for doc_type, doc in documents.items() if doc_type in PLANNER_DOCUMENT_TYPES and not doc.get("valid")]
    budget_errors = []
    if "budget_plan" in documents:
        budget_errors = validate_budget_content(documents["budget_plan"].get("content") or {})
        if budget_errors and "budget_plan" not in invalid:
            invalid.append("budget_plan")
    return {"valid": not missing and not invalid, "missing": missing, "invalid": invalid, "budget_errors": budget_errors}


def empty_context_summary() -> dict[str, Any]:
    return {
        "conversation_summary": "",
        "decision_log": [],
        "open_questions": [],
        "constraints": {},
        "research_facts_summary": [],
        "document_change_summary": "",
    }


def empty_memo() -> dict[str, Any]:
    return {"markdown": "", "caption": "", "source": "Planner", "items": 0, "tiles": []}


def empty_budget() -> dict[str, Any]:
    return {
        "categories": [],
        "daily": [],
        "total_amount": "Budget TBD",
        "total_label": "",
        "estimated_total_idr": None,
        "per_person_idr": None,
        "budget_constraint": None,
    }


def item_categories(item: dict[str, Any] | None) -> list[str]:
    categories = list((item or {}).get("categories") or ["pantai"])
    try:
        return validate_categories(categories)
    except ValueError:
        return ["pantai"]


def expand_destinations_for_duration(destinations: list[dict[str, Any]], days: int) -> list[dict[str, Any]]:
    if not destinations:
        return []
    expanded = []
    for index in range(max(days, 1)):
        base = dict(destinations[index % len(destinations)])
        base["order"] = index + 1
        base["days"] = [index + 1]
        expanded.append(base)
    return expanded


def estimate_total_idr(items: list[dict[str, Any]], days: int, travelers: int) -> int:
    base = sum(((item.get("estimated_cost") or {}).get("amount_idr") or 0) for item in items)
    if not base:
        base = 350_000
    return round(base * max(days, 1) * max(travelers, 1))


def parse_budget_constraint(source_text: str, traveler_count: int) -> BudgetConstraint | None:
    amount = extract_budget_amount_idr(source_text)
    if amount is None or budget_request_is_ambiguous(source_text):
        return None
    text = source_text.lower()
    per_person = any(marker in text for marker in ["per orang", "per person", "pp", "/person", "each person"])
    daily = any(marker in text for marker in ["harian", "per hari", "daily", "per day", "/day"])
    fixed = any(marker in text for marker in [" fix", "fixed", "harus", "tepat", "exact", "pas"])
    capped = any(
        marker in text
        for marker in ["max", "maks", "maksimal", "jangan lebih", "tidak lebih", "under", "below", "cap", "limit"]
    )
    if daily:
        mode = "daily_cap"
    elif per_person and capped:
        mode = "max_per_person"
    elif per_person:
        mode = "fixed_per_person"
    elif capped:
        mode = "max_total"
    elif fixed or "total" in text:
        mode = "fixed_total"
    else:
        return None
    return BudgetConstraint(
        budget_mode=mode,
        amount_idr=amount,
        traveler_count=traveler_count,
        strict=True,
        source_text=source_text.strip(),
    )


def budget_request_is_ambiguous(source_text: str) -> bool:
    amount = extract_budget_amount_idr(source_text)
    if amount is None:
        return False
    text = source_text.lower()
    mentions_budget = any(marker in text for marker in ["budget", "biaya", "rp", "juta", "jt", "million"])
    has_scope = any(marker in text for marker in ["total", "per orang", "per person", "pp", "harian", "per hari", "daily", "per day"])
    has_mode = any(
        marker in text
        for marker in [" fix", "fixed", "harus", "tepat", "exact", "pas", "max", "maks", "maksimal", "jangan lebih", "under", "below", "cap", "limit"]
    )
    return mentions_budget and not has_scope and not has_mode


def extract_budget_amount_idr(source_text: str) -> int | None:
    text = source_text.lower()
    suffix_match = re.search(r"(?:rp\s*)?(\d+(?:[.,]\d+)?)\s*(juta|jt|million|m)\b", text)
    if suffix_match:
        return round(float(suffix_match.group(1).replace(",", ".")) * 1_000_000)
    rp_match = re.search(r"rp\s*([\d.,]+)", text)
    if rp_match:
        digits = re.sub(r"\D", "", rp_match.group(1))
        return int(digits) if digits else None
    number_match = re.search(r"\b(\d{1,3}(?:[.,]\d{3})+|\d{6,})\b", text)
    if number_match:
        digits = re.sub(r"\D", "", number_match.group(1))
        return int(digits) if digits else None
    return None


def normalize_budget_content(
    content: dict[str, Any],
    *,
    traveler_count: int,
    duration_days: int,
    constraint: BudgetConstraint | None = None,
) -> dict[str, Any]:
    total = int(content.get("estimated_total_idr") or 0) or 500_000
    duration = max(duration_days, 1)
    if constraint:
        if constraint.budget_mode == "fixed_total":
            total = constraint.amount_idr
        elif constraint.budget_mode == "max_total":
            total = min(total, constraint.amount_idr)
        elif constraint.budget_mode == "fixed_per_person":
            total = constraint.amount_idr * traveler_count
        elif constraint.budget_mode == "max_per_person":
            total = min(total, constraint.amount_idr * traveler_count)
        elif constraint.budget_mode == "daily_cap":
            total = min(total, constraint.amount_idr * duration)
    normalized = dict(content)
    normalized["estimated_total_idr"] = total
    normalized["per_person_idr"] = round(total / max(traveler_count, 1))
    normalized["total_amount"] = format_idr(total)
    normalized["total_label"] = budget_total_label(traveler_count, duration, constraint)
    normalized["budget_constraint"] = constraint.model_dump() if constraint else None
    normalized["categories"] = normalize_budget_categories(normalized.get("categories") or [], total, constraint)
    normalized["daily"] = normalize_budget_daily(normalized.get("daily") or [], total, duration, constraint)
    return normalized


def budget_total_label(traveler_count: int, duration_days: int, constraint: BudgetConstraint | None) -> str:
    base = f"for {traveler_count} people - {duration_days} days"
    if not constraint:
        return base
    labels = {
        "fixed_total": "fixed total",
        "max_total": "maximum total",
        "fixed_per_person": "fixed per-person",
        "max_per_person": "maximum per-person",
        "daily_cap": "daily cap",
    }
    return f"{labels[constraint.budget_mode]} {base}"


def normalize_budget_categories(
    categories: list[dict[str, Any]],
    total: int,
    constraint: BudgetConstraint | None,
) -> list[dict[str, Any]]:
    category_ids = [category.get("id") for category in categories if category.get("id")] or list(BUDGET_ALLOCATION_WEIGHTS)
    amounts = distribute_amount(total, category_ids)
    note = "(Fixed budget constraint)" if constraint and constraint.budget_mode.startswith("fixed") else "(Estimated within budget constraint)" if constraint else "(Estimated)"
    normalized = []
    existing_by_id = {category.get("id"): category for category in categories}
    for category_id in category_ids:
        original = existing_by_id.get(category_id) or {}
        amount = amounts[category_id]
        label = original.get("label") or BUDGET_LABELS.get(category_id, category_id.replace("_", " ").title())
        items = list(original.get("items") or [])
        line = {"label": label, "amount": format_idr(amount), "detail": "Adjusted to match planner budget constraint."}
        if items:
            items[0] = {**items[0], **line}
        else:
            items = [line]
        normalized.append({**original, "id": category_id, "label": label, "amount": format_idr(amount), "note": note, "items": items})
    return normalized


def normalize_budget_daily(
    rows: list[dict[str, Any]],
    total: int,
    duration_days: int,
    constraint: BudgetConstraint | None,
) -> list[dict[str, Any]]:
    count = max(len(rows), duration_days, 1)
    row_ids = [str(index) for index in range(count)]
    row_totals = distribute_amount(total, row_ids)
    normalized = []
    for index in range(count):
        original = rows[index] if index < len(rows) else {}
        day_total = row_totals[str(index)]
        if constraint and constraint.budget_mode == "daily_cap":
            day_total = min(day_total, constraint.amount_idr)
        amount_keys = list((original.get("amounts") or {}).keys()) or list(BUDGET_ALLOCATION_WEIGHTS)
        amounts = distribute_amount(day_total, amount_keys)
        normalized.append(
            {
                **original,
                "day": int(original.get("day") or index + 1),
                "title": original.get("title") or f"Day {index + 1}",
                "route": original.get("route") or "Budget allocation",
                "amounts": amounts,
            }
        )
    return normalized


def distribute_amount(total: int, keys: list[str]) -> dict[str, int]:
    if not keys:
        return {}
    weights = [BUDGET_ALLOCATION_WEIGHTS.get(key, 1 / len(keys)) for key in keys]
    weight_total = sum(weights) or 1
    distributed = {}
    assigned = 0
    for key, weight in zip(keys[:-1], weights[:-1], strict=False):
        value = round(total * (weight / weight_total))
        distributed[key] = value
        assigned += value
    distributed[keys[-1]] = total - assigned
    return distributed


def validate_budget_content(content: dict[str, Any]) -> list[str]:
    errors = []
    constraint_data = content.get("budget_constraint")
    if not constraint_data:
        return errors
    constraint = BudgetConstraint.model_validate(constraint_data)
    total = int(content.get("estimated_total_idr") or 0)
    per_person = int(content.get("per_person_idr") or 0)
    category_total = sum(parse_idr_amount(category.get("amount")) for category in content.get("categories") or [])
    daily_totals = [sum(int(value or 0) for value in (row.get("amounts") or {}).values()) for row in content.get("daily") or []]
    if category_total != total:
        errors.append("budget_category_rollup_mismatch")
    if sum(daily_totals) != total:
        errors.append("budget_daily_rollup_mismatch")
    expected_per_person = round(total / max(constraint.traveler_count, 1))
    if per_person != expected_per_person:
        errors.append("budget_per_person_mismatch")
    if constraint.budget_mode == "fixed_total" and total != constraint.amount_idr:
        errors.append("fixed_total_budget_mismatch")
    if constraint.budget_mode == "max_total" and total > constraint.amount_idr:
        errors.append("max_total_budget_exceeded")
    if constraint.budget_mode == "fixed_per_person" and per_person != constraint.amount_idr:
        errors.append("fixed_per_person_budget_mismatch")
    if constraint.budget_mode == "max_per_person" and per_person > constraint.amount_idr:
        errors.append("max_per_person_budget_exceeded")
    if constraint.budget_mode == "daily_cap" and any(day_total > constraint.amount_idr for day_total in daily_totals):
        errors.append("daily_budget_cap_exceeded")
    return errors


def parse_idr_amount(label: str | None) -> int:
    if not label:
        return 0
    digits = re.sub(r"\D", "", label)
    return int(digits) if digits else 0


def date_label(start: str, offset: int) -> str:
    try:
        value = date.fromisoformat(start) + timedelta(days=offset)
        return value.strftime("%a, %b %d")
    except ValueError:
        return f"Day {offset + 1}"


def document_title(document_type: str) -> str:
    return {
        "trip_memo": "Trip Memo",
        "full_itinerary": "Full Itinerary",
        "budget_plan": "Budget Plan",
    }.get(document_type, document_type)


def tool_label(tool: str) -> str:
    return {
        "read_trip_context": "Read trip context",
        "read_documents": "Read planner documents",
        "replace_trip_memo": "Updated Trip Memo",
        "replace_full_itinerary": "Updated Full Itinerary",
        "replace_budget_plan": "Updated Budget Plan",
        "patch_itinerary_day": "Edited itinerary",
        "patch_budget_category": "Adjusted budget",
        "patch_memo_section": "Edited trip memo",
        "validate_documents": "Validated documents",
        "places_text_search": "Searched Places by text",
        "places_details": "Loaded Place Details",
        "grounded_web_research": "Searched Google for current travel context",
        "compute_budget_summary": "Computed budget summary",
        "finish_response": "Wrote response",
        "request_clarification": "Requested clarification",
    }.get(tool, tool)


def sanitize_payload(payload: dict[str, Any]) -> dict[str, Any]:
    forbidden = {"raw_prompt_text", "raw_response_text", "api_key", "headers", "password", "cookie"}
    cleaned = {}
    for key, value in payload.items():
        if key in forbidden:
            continue
        if isinstance(value, dict):
            cleaned[key] = sanitize_payload(value)
        elif isinstance(value, list):
            cleaned[key] = [sanitize_payload(item) if isinstance(item, dict) else item for item in value]
        else:
            cleaned[key] = value
    return cleaned
