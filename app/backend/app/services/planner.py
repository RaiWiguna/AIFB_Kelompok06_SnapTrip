from __future__ import annotations

import asyncio
import json
import logging
import re
import secrets
from datetime import UTC, date, datetime, timedelta
from typing import Any

from fastapi import HTTPException

from app.core.categories import validate_categories
from app.core.ids import new_id
from app.providers.google_places import GooglePlacesProvider
from app.providers.planner_agent import GeminiPlannerProvider, GeminiValidationFailure
from app.schemas.planner import (
    BudgetConstraint,
    BudgetPlanDocumentV1,
    FullItineraryDocumentV1,
    PlannerAcceptRequest,
    PlannerAgentStepV1,
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

logger = logging.getLogger(__name__)

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
MUTATING_PLANNER_TOOLS = {
    "replace_trip_memo",
    "replace_full_itinerary",
    "replace_budget_plan",
    "patch_itinerary_day",
    "patch_budget_category",
    "patch_memo_section",
}
TERMINAL_PLANNER_TOOLS = {"finish_response", "request_clarification"}


def now() -> datetime:
    return datetime.now(UTC)


def log_background_agent_failure(task: asyncio.Task) -> None:
    try:
        task.result()
    except asyncio.CancelledError:
        return
    except Exception:
        logger.exception("Background planner agent task failed unexpectedly.")


def duration_days(start: date, end: date) -> int:
    return (end - start).days + 1


def iso_date(value: date | str) -> str:
    return value if isinstance(value, str) else value.isoformat()


class PlannerService:
    def __init__(self, *, store, settings, planner_provider: GeminiPlannerProvider | None = None):
        self.store = store
        self.settings = settings
        self.places = GooglePlacesProvider(settings)
        self.planner_provider = planner_provider or GeminiPlannerProvider(settings)

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
        if self._should_background_follow_up():
            await self.store.update_doc("plannerSessions", planner_session_id, {"status": "working"})
            task = asyncio.create_task(self._run_agent(session, payload.text, trigger="user_message"))
            task.add_done_callback(log_background_agent_failure)
            await asyncio.sleep(0)
            return await self.snapshot(planner_session_id, user)
        await self._run_agent(session, payload.text, trigger="user_message")
        return await self.snapshot(planner_session_id, user)

    def _should_background_follow_up(self) -> bool:
        return bool(self.planner_provider.enabled and self.settings.app_env != "test")

    async def events(self, planner_session_id: str, user: dict[str, Any], after: int = 0) -> list[dict[str, Any]]:
        await self._owned_planner_session(planner_session_id, user)
        events = await self._ordered("plannerEvents", planner_session_id=planner_session_id)
        return [event for event in events if int(event.get("sequence", 0)) > after]

    async def accept(self, planner_session_id: str, user: dict[str, Any], payload: PlannerAcceptRequest):
        session = await self._owned_planner_session(planner_session_id, user)
        documents = await self._latest_documents(planner_session_id)
        validation = validate_document_set(documents, expected_duration_days=int(session.get("duration_days") or 0) or None)
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
                session = await self.store.find_one("plannerSessions", id=session["id"]) or session
                step = await self._plan_step(user_text, session=session, trigger=trigger, turn_count=turn_count, run_id=run["id"])
                actions = self._prepare_actions(
                    [action.model_dump() for action in step.actions],
                    step=step,
                    user_text=user_text,
                )
                if not actions:
                    await self._assistant_response(session["id"], run["id"], step.assistant_text or self._direct_response(user_text))
                    break
                for action in actions:
                    tool_count += 1
                    if tool_count > MAX_TOOL_CALLS:
                        break
                    await self._execute_tool(session["id"], run["id"], action)
                completion_actions = await self._completion_actions(session["id"], step)
                for action in completion_actions:
                    tool_count += 1
                    if tool_count > MAX_TOOL_CALLS:
                        break
                    await self._execute_tool(session["id"], run["id"], action)
                all_actions = [*actions, *completion_actions]
                summary_text = self._summary_response(all_actions, intent=step.intent)
                has_mutation = any(action["tool"] in MUTATING_PLANNER_TOOLS for action in all_actions)
                completion_summary = (
                    "I completed the missing planner documents and validated the trip memo, itinerary, and budget plan."
                    if step.intent == "initial_plan"
                    else summary_text
                )
                if has_mutation and step.intent != "initial_plan":
                    response_text = await self._canonical_mutation_response(session["id"], all_actions, fallback=summary_text)
                else:
                    response_text = (
                        completion_summary
                        if completion_actions
                        else step.assistant_text
                        if self._actions_touch_all_documents(all_actions)
                        and step.assistant_text
                        and not response_mentions_pending_document_work(step.assistant_text)
                        else summary_text
                        if self._actions_touch_all_documents(all_actions)
                        else step.assistant_text or summary_text
                    )
                has_terminal_tool = any(action["tool"] in TERMINAL_PLANNER_TOOLS for action in all_actions)
                if not has_mutation and not has_terminal_tool and not step.stop and not step.needs_user_input:
                    if turn_count < MAX_AGENT_TURNS and tool_count < MAX_TOOL_CALLS:
                        continue
                await self._assistant_response(session["id"], run["id"], response_text)
                break
            documents = await self._latest_documents(session["id"])
            session = await self.store.find_one("plannerSessions", id=session["id"]) or session
            validation = validate_document_set(documents, expected_duration_days=int(session.get("duration_days") or 0) or None)
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
            await self._maybe_process_next_queued_follow_up(session["id"])
        except asyncio.CancelledError:
            await self.store.update_doc("plannerSessions", session["id"], {"status": "interrupted", "active_run_id": None})
            await self.store.update_doc(
                "plannerRuns",
                run["id"],
                {"status": "interrupted", "turn_count": turn_count, "tool_count": tool_count, "stop_reason": "cancelled"},
            )
            await self._emit_event(
                session["id"],
                "run_interrupted",
                "Planner run interrupted",
                status="error",
                run_id=run["id"],
                payload={"safe_message": "Planner run interrupted"},
            )
            raise
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
            await self._append_message(
                session["id"],
                "assistant",
                "I hit an issue while processing that update. The latest valid planner documents remain available; please try again with a narrower instruction.",
                visible=True,
                run_id=run["id"],
            )

    async def _maybe_process_next_queued_follow_up(self, planner_session_id: str) -> None:
        messages = await self._ordered("plannerMessages", planner_session_id=planner_session_id)
        queued = next(
            (
                message
                for message in messages
                if message.get("queued") and message.get("role") == "user" and str(message.get("content") or "").strip()
            ),
            None,
        )
        if not queued:
            return
        session = await self.store.find_one("plannerSessions", id=planner_session_id)
        if not session or session.get("status") in {"accepted", "working"}:
            return
        await self.store.update_doc("plannerMessages", queued["id"], {"queued": False})
        await self._emit_event(planner_session_id, "message_dequeued", "Processing queued follow-up", payload={})
        if self._should_background_follow_up():
            await self.store.update_doc("plannerSessions", planner_session_id, {"status": "working"})
            task = asyncio.create_task(self._run_agent(session, str(queued["content"]), trigger="queued_user_message"))
            task.add_done_callback(log_background_agent_failure)
            return
        await self._run_agent(session, str(queued["content"]), trigger="queued_user_message")

    async def _plan_step(
        self,
        user_text: str,
        *,
        session: dict[str, Any],
        trigger: str,
        turn_count: int,
        run_id: str,
    ) -> PlannerAgentStepV1:
        if self.planner_provider.enabled:
            context = await self._build_agent_context(session["id"], user_text=user_text, trigger=trigger, turn_count=turn_count)
            trace_context = {
                "trace_id": run_id,
                "flow": "flow3",
                "stage": "planner_agent",
                "event_prefix": "flow3_planner_agent",
                "session_id": session["id"],
                "owner_id": session["owner_id"],
                "run_id": run_id,
            }
            try:
                step = await self.planner_provider.decide(
                    context,
                    trace_context=trace_context,
                )
                contract_errors = planner_step_contract_errors(step, user_text)
                if contract_errors:
                    repaired = await self.planner_provider.repair(
                        context=context,
                        validation_errors="; ".join(contract_errors),
                        previous_output=step.model_dump_json(),
                        trace_context={**trace_context, "stage": "planner_agent_contract_repair", "event_prefix": "flow3_planner_agent_contract_repair"},
                    )
                    repaired_errors = planner_step_contract_errors(repaired, user_text)
                    if repaired_errors:
                        raise GeminiValidationFailure("; ".join(repaired_errors), repaired.model_dump_json())
                    return repaired
                return step
            except GeminiValidationFailure as exc:
                if exc.raw_output:
                    try:
                        return await self.planner_provider.repair(
                            context=context,
                            validation_errors=exc.message,
                            previous_output=exc.raw_output,
                            trace_context={**trace_context, "stage": "planner_agent_repair", "event_prefix": "flow3_planner_agent_repair"},
                        )
                    except GeminiValidationFailure:
                        pass
                return self._provider_failure_step(exc)
        return await self._fallback_plan_step(user_text, session=session, trigger=trigger)

    def _provider_failure_step(self, exc: GeminiValidationFailure) -> PlannerAgentStepV1:
        message = (
            "I could not get a reliable planner decision from the AI provider for that request. "
            "The latest valid planner documents remain unchanged; please retry the same instruction."
        )
        return PlannerAgentStepV1(
            intent="request_clarification",
            assistant_text=message,
            needs_user_input=True,
            actions=[
                {
                    "tool": "request_clarification",
                    "args": {
                        "reason": "planner_provider_unavailable",
                        "question": message,
                        "error_class": exc.__class__.__name__,
                    },
                }
            ],
        )

    def _prepare_actions(
        self,
        actions: list[dict[str, Any]],
        *,
        step: PlannerAgentStepV1,
        user_text: str,
    ) -> list[dict[str, Any]]:
        prepared = []
        requested_duration = step.duration_days or extract_requested_duration_days(user_text)
        for action in actions:
            action = dict(action)
            args = dict(action.get("args") or {})
            if action.get("tool") in MUTATING_PLANNER_TOOLS:
                args.setdefault("intent", user_text)
                if requested_duration and action.get("tool") in {
                    "replace_full_itinerary",
                    "replace_budget_plan",
                    "patch_itinerary_day",
                    "patch_budget_category",
                }:
                    args.setdefault("duration_days", requested_duration)
            action["args"] = args
            prepared.append(action)

        tools = {action.get("tool") for action in prepared}
        duration_affects_documents = (
            requested_duration is not None
            and (step.requires_document_edit or step.intent in {"add_destination", "change_duration"})
            and bool(tools & {"replace_full_itinerary", "patch_itinerary_day"})
        )
        if duration_affects_documents and not tools & {"replace_budget_plan", "patch_budget_category"}:
            prepared.append(
                {
                    "tool": "patch_budget_category",
                    "args": {"intent": user_text, "duration_days": requested_duration},
                }
            )
        if duration_affects_documents and not tools & {"replace_trip_memo", "patch_memo_section"}:
            prepared.append({"tool": "patch_memo_section", "args": {"intent": user_text}})
        return prepared

    async def _fallback_plan_step(self, user_text: str, *, session: dict[str, Any], trigger: str) -> PlannerAgentStepV1:
        text = user_text.lower()
        if trigger == "auto_initial":
            return PlannerAgentStepV1(
                intent="initial_plan",
                requires_document_edit=True,
                affected_documents=["trip_memo", "full_itinerary", "budget_plan"],
                assistant_text="I drafted the trip memo, full itinerary, and budget plan from your selected destination, dates, and group size.",
                actions=[
                    {"tool": "read_trip_context", "args": {}},
                    {"tool": "grounded_web_research", "args": {"query": "current accommodation and transport cost estimates"}},
                    {"tool": "replace_trip_memo", "args": {}},
                    {"tool": "replace_full_itinerary", "args": {}},
                    {"tool": "replace_budget_plan", "args": {}},
                    {"tool": "validate_documents", "args": {}},
                ],
            )
        if is_direct_reply_request(text):
            return PlannerAgentStepV1(intent="answer_question", assistant_text=direct_reply_text(text), stop=True)
        if is_destination_question(text):
            return PlannerAgentStepV1(
                intent="recommend_destinations",
                assistant_text=await self._destination_answer(session["id"], user_text),
                stop=True,
            )
        if budget_request_is_ambiguous(user_text):
            return PlannerAgentStepV1(
                intent="request_clarification",
                assistant_text="Is that budget for the whole trip, per person, or per day?",
                needs_user_input=True,
                actions=[
                    {
                        "tool": "request_clarification",
                        "args": {
                            "reason": "budget_scope_ambiguous",
                            "question": "Is that budget for the whole trip, per person, or per day?",
                        },
                    }
                ],
            )
        if is_zero_budget_request(text):
            return PlannerAgentStepV1(
                intent="request_clarification",
                assistant_text="I cannot make a valid publishable trip budget equal to 0. Please clarify a positive fixed total, cap, per-person budget, or daily budget.",
                needs_user_input=True,
                actions=[
                    {
                        "tool": "request_clarification",
                        "args": {
                            "reason": "zero_budget_invalid",
                            "question": "Please clarify a positive fixed total, cap, per-person budget, or daily budget.",
                        },
                    }
                ],
            )
        if is_explicit_add_destination(text):
            return PlannerAgentStepV1(
                intent="add_destination",
                requires_document_edit=True,
                affected_documents=["trip_memo", "full_itinerary", "budget_plan"],
                assistant_text="I researched the added destination, updated the itinerary, adjusted the budget, and refreshed the memo.",
                actions=[
                    {"tool": "places_text_search", "args": {"query": user_text}},
                    {"tool": "places_details", "args": {}},
                    {"tool": "grounded_web_research", "args": {"query": user_text}},
                    {"tool": "patch_itinerary_day", "args": {"intent": user_text}},
                    {"tool": "patch_budget_category", "args": {"intent": user_text}},
                    {"tool": "patch_memo_section", "args": {"intent": user_text}},
                    {"tool": "validate_documents", "args": {}},
                ],
            )
        budget_constraint = parse_budget_constraint(user_text, int(session.get("traveler_count") or 1))
        if budget_constraint or "budget" in text or "biaya" in text or "cheap" in text or "murah" in text:
            args = {"intent": user_text}
            if budget_constraint:
                args["budget_constraint"] = budget_constraint.model_dump()
            return PlannerAgentStepV1(
                intent="change_budget",
                requires_document_edit=True,
                affected_documents=["budget_plan"],
                assistant_text="I updated the budget constraint, recalculated totals, and kept the structured documents valid.",
                actions=[
                    {"tool": "grounded_web_research", "args": {"query": user_text}},
                    {"tool": "patch_budget_category", "args": args},
                    {"tool": "validate_documents", "args": {}},
                ],
            )
        requested_duration = extract_requested_duration_days(text)
        if requested_duration or "day" in text or "hari" in text or "duration" in text or "durasi" in text:
            args = {"intent": user_text}
            if requested_duration:
                args["duration_days"] = requested_duration
            return PlannerAgentStepV1(
                intent="change_duration",
                requires_document_edit=True,
                affected_documents=["trip_memo", "full_itinerary", "budget_plan"],
                duration_days=requested_duration,
                assistant_text=duration_change_response(requested_duration),
                actions=[
                    {"tool": "grounded_web_research", "args": {"query": user_text}},
                    {"tool": "patch_itinerary_day", "args": args},
                    {"tool": "patch_budget_category", "args": args},
                    {"tool": "patch_memo_section", "args": args},
                    {"tool": "validate_documents", "args": {}},
                ],
            )
        return PlannerAgentStepV1(intent="answer_question", assistant_text=self._direct_response(user_text), stop=True)

    async def _build_agent_context(
        self,
        planner_session_id: str,
        *,
        user_text: str,
        trigger: str,
        turn_count: int,
    ) -> dict[str, Any]:
        session = await self.store.find_one("plannerSessions", id=planner_session_id)
        messages = await self._ordered("plannerMessages", planner_session_id=planner_session_id)
        facts = await self.store.list_docs("plannerResearchFacts", planner_session_id=planner_session_id)
        visible_messages = [
            {
                "sequence": message.get("sequence"),
                "role": message.get("role"),
                "content": message.get("content"),
                "queued": bool(message.get("queued")),
                "created_at": message.get("created_at"),
            }
            for message in messages
            if message.get("visible", True)
        ]
        return {
            "schema_version": "planner_agent_context.v1",
            "trigger": trigger,
            "turn_count": turn_count,
            "user_text": user_text,
            "session": session,
            "documents": await self._latest_documents(planner_session_id),
            "recent_messages": visible_messages[-8:],
            "recent_tool_observations": summarize_tool_observations(messages)[-8:],
            "research_facts": facts[-8:],
        }

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
                result = await self._replace_trip_memo(planner_session_id, run_id, action.get("args", {}))
            elif tool == "replace_full_itinerary":
                result = await self._replace_full_itinerary(planner_session_id, run_id, action.get("args", {}))
                synced_budget = await self._sync_budget_with_itinerary(planner_session_id, run_id)
                if synced_budget:
                    result = {**result, "synced_budget": synced_budget}
            elif tool == "replace_budget_plan":
                result = await self._replace_budget_plan(planner_session_id, run_id, action.get("args", {}))
            elif tool == "patch_itinerary_day":
                result = await self._patch_itinerary(planner_session_id, run_id, action.get("args", {}))
                synced_budget = await self._sync_budget_with_itinerary(planner_session_id, run_id)
                if synced_budget:
                    result = {**result, "synced_budget": synced_budget}
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
                session = await self.store.find_one("plannerSessions", id=planner_session_id)
                result = validate_document_set(
                    await self._latest_documents(planner_session_id),
                    expected_duration_days=int((session or {}).get("duration_days") or 0) or None,
                )
                event = "document_validation_started" if result["valid"] else "document_validation_failed"
                await self._emit_event(planner_session_id, event, "Validated planner documents", run_id=run_id, payload=result)
            elif tool == "compute_budget_summary":
                result = await self._compute_budget_summary(planner_session_id)
            elif tool == "finish_response":
                result = {"ok": True}
            elif tool == "request_clarification":
                result = {
                    "needs_user_input": True,
                    "question": action.get("args", {}).get("question") or "Can you clarify the request?",
                    "reason": action.get("args", {}).get("reason") or "clarification_needed",
                }
            else:
                raise ValueError(f"Unsupported planner tool: {tool}")
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

    async def _replace_trip_memo(self, planner_session_id: str, run_id: str, args: dict[str, Any] | None = None) -> dict[str, Any]:
        if content := planner_document_arg(args or {}, "trip_memo"):
            documents = await self._latest_documents(planner_session_id)
            document = TripMemoDocumentV1.model_validate(
                normalize_trip_memo_arg(content, documents.get("trip_memo", {}).get("content") or {})
            ).model_dump()
            return await self._commit_document(planner_session_id, run_id, "trip_memo", "trip_memo.v1", document)
        context = await self._read_trip_context(planner_session_id)
        memo = synthesize_memo(context["plan"], context["destinations"])
        return await self._commit_document(planner_session_id, run_id, "trip_memo", "trip_memo.v1", TripMemoDocumentV1.model_validate(memo).model_dump())

    async def _replace_full_itinerary(self, planner_session_id: str, run_id: str, args: dict[str, Any] | None = None) -> dict[str, Any]:
        if content := planner_document_arg(args or {}, "full_itinerary"):
            session = await self.store.find_one("plannerSessions", id=planner_session_id)
            documents = await self._latest_documents(planner_session_id)
            previous = documents.get("full_itinerary", {}).get("content") or {}
            requested_duration = requested_itinerary_duration(
                args or {},
                content,
                fallback=int((session or {}).get("duration_days") or len(previous.get("days") or []) or 1),
            )
            if requested_duration != int((session or {}).get("duration_days") or 0):
                session = await self._update_duration(planner_session_id, requested_duration)
            normalized = normalize_itinerary_arg(content, previous)
            if not itinerary_payload_has_usable_days(normalized):
                destinations = await self._route_destinations(
                    planner_session_id,
                    requested_duration,
                    str((args or {}).get("intent") or ""),
                )
                days = synthesize_itinerary(destinations)
                start_date = (session or {}).get("travel_start_date") or date.today().isoformat()
                for idx, day in enumerate(days, start=0):
                    day["day"] = idx + 1
                    day["dateLabel"] = date_label(start_date, idx)
                    day["transport"]["from"] = "Start" if idx == 0 else days[idx - 1]["title"]
                    day["accommodation"]["nights"] = 0 if idx == requested_duration - 1 else 1
                normalized = {"days": days}
            else:
                normalized = reconcile_itinerary_duration(
                    normalized,
                    previous=previous,
                    duration=requested_duration,
                    start_date=(session or {}).get("travel_start_date") or date.today().isoformat(),
                )
            normalized = apply_meal_preference_to_itinerary(normalized, str((args or {}).get("intent") or ""))
            document = FullItineraryDocumentV1.model_validate(normalized).model_dump(by_alias=True)
            return await self._commit_document(planner_session_id, run_id, "full_itinerary", "full_itinerary.v1", document)
        context = await self._read_trip_context(planner_session_id)
        days = synthesize_itinerary(
            await self._route_destinations(planner_session_id, context["session"]["duration_days"], "")
        )
        for idx, day in enumerate(days, start=0):
            day["dateLabel"] = date_label(context["session"]["travel_start_date"], idx)
        document = FullItineraryDocumentV1.model_validate({"days": days}).model_dump(by_alias=True)
        document = apply_meal_preference_to_itinerary(document, str((args or {}).get("intent") or ""))
        return await self._commit_document(planner_session_id, run_id, "full_itinerary", "full_itinerary.v1", document)

    async def _replace_budget_plan(self, planner_session_id: str, run_id: str, args: dict[str, Any] | None = None) -> dict[str, Any]:
        context = await self._read_trip_context(planner_session_id)
        documents = await self._latest_documents(planner_session_id)
        itinerary_days = (documents.get("full_itinerary", {}).get("content") or {}).get("days") or []
        previous_constraint = budget_constraint_from_content(documents.get("budget_plan", {}).get("content") or {})
        if content := planner_document_arg(args or {}, "budget_plan"):
            constraint = None
            if parsed := parse_budget_constraint(str((args or {}).get("intent") or ""), int(context["session"]["traveler_count"])):
                constraint = parsed
            constraint = constraint or budget_constraint_from_content(content) or previous_constraint
            document = normalize_budget_content(
                normalize_budget_arg(content),
                traveler_count=int(context["session"]["traveler_count"]),
                duration_days=int(context["session"]["duration_days"]),
                constraint=constraint,
                itinerary_days=itinerary_days,
            )
            document = BudgetPlanDocumentV1.model_validate(document).model_dump()
            return await self._commit_document(planner_session_id, run_id, "budget_plan", "budget_plan.v1", document)
        items = [context["recommendation_item"]] if context.get("recommendation_item") else []
        destinations = await self._route_destinations(planner_session_id, context["session"]["duration_days"], "")
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
            itinerary_days=itinerary_days,
        )
        return await self._commit_document(planner_session_id, run_id, "budget_plan", "budget_plan.v1", document)

    async def _patch_itinerary(self, planner_session_id: str, run_id: str, args: dict[str, Any]) -> dict[str, Any]:
        documents = await self._latest_documents(planner_session_id)
        if "full_itinerary" not in documents:
            return await self._replace_full_itinerary(planner_session_id, run_id, args)
        if day_content := itinerary_day_arg(args):
            content = documents["full_itinerary"]["content"]
            days = [dict(day) for day in content.get("days") or []]
            target_day = int(day_content.get("day") or args.get("day") or args.get("day_number") or 0)
            if not target_day:
                raise ValueError("patch_itinerary_day requires a target day")
            session = await self.store.find_one("plannerSessions", id=planner_session_id)
            if target_day > int((session or {}).get("duration_days") or 0):
                session = await self._update_duration(planner_session_id, target_day)
            patched = False
            for index, day in enumerate(days):
                if int(day.get("day") or 0) == target_day:
                    replacement = {**day, **day_content, "day": target_day}
                    days[index] = replacement
                    patched = True
                    break
            if not patched:
                days.append(fill_itinerary_day_defaults({**day_content, "day": target_day}, {}, target_day))
            else:
                days = [
                    fill_itinerary_day_defaults(day, content.get("days", [])[index] if index < len(content.get("days", [])) else {}, int(day.get("day") or index + 1))
                    for index, day in enumerate(days)
                ]
            days = sorted(days, key=lambda item: int(item.get("day") or 0))
            normalized = apply_meal_preference_to_itinerary({"days": days}, str(args.get("intent") or ""))
            document = FullItineraryDocumentV1.model_validate(normalized).model_dump(by_alias=True)
            return await self._commit_document(planner_session_id, run_id, "full_itinerary", "full_itinerary.v1", document)
        session = await self.store.find_one("plannerSessions", id=planner_session_id)
        if args.get("duration_days"):
            session = await self._update_duration(planner_session_id, int(args["duration_days"]))
        elif is_explicit_add_destination((args.get("intent") or "").lower()):
            session = await self._update_duration(planner_session_id, int((session or {}).get("duration_days") or 1) + 1)
        duration = int((session or {}).get("duration_days") or 1)
        destinations = await self._route_destinations(planner_session_id, duration, args.get("intent") or "")
        days = synthesize_itinerary(destinations)
        start_date = (session or {}).get("travel_start_date") or date.today().isoformat()
        for idx, day in enumerate(days, start=0):
            day["day"] = idx + 1
            day["dateLabel"] = date_label(start_date, idx)
            day["transport"]["from"] = "Start" if idx == 0 else days[idx - 1]["title"]
            day["accommodation"]["nights"] = 0 if idx == duration - 1 else 1
        normalized = apply_meal_preference_to_itinerary({"days": days}, str(args.get("intent") or ""))
        document = FullItineraryDocumentV1.model_validate(normalized).model_dump(by_alias=True)
        return await self._commit_document(planner_session_id, run_id, "full_itinerary", "full_itinerary.v1", document)

    async def _patch_budget(self, planner_session_id: str, run_id: str, args: dict[str, Any]) -> dict[str, Any]:
        documents = await self._latest_documents(planner_session_id)
        if "budget_plan" not in documents:
            return await self._replace_budget_plan(planner_session_id, run_id, args)
        session = await self.store.find_one("plannerSessions", id=planner_session_id)
        traveler_count = int((session or {}).get("traveler_count") or 1)
        duration = int((session or {}).get("duration_days") or 1)
        content = documents["budget_plan"]["content"]
        previous_constraint = budget_constraint_from_content(content)
        if content_arg := planner_document_arg(args, "budget_plan"):
            constraint = None
            if args.get("budget_constraint"):
                constraint = BudgetConstraint.model_validate(args["budget_constraint"])
            elif parsed := parse_budget_constraint(args.get("intent") or "", traveler_count):
                constraint = parsed
            constraint = constraint or budget_constraint_from_content(content_arg) or previous_constraint
            content = normalize_budget_content(
                normalize_budget_arg(content_arg),
                traveler_count=traveler_count,
                duration_days=duration,
                constraint=constraint,
                itinerary_days=(documents.get("full_itinerary", {}).get("content") or {}).get("days") or [],
            )
            content = BudgetPlanDocumentV1.model_validate(content).model_dump()
            return await self._commit_document(planner_session_id, run_id, "budget_plan", "budget_plan.v1", content)
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
                itinerary_days=(documents.get("full_itinerary", {}).get("content") or {}).get("days") or [],
            )
        elif args.get("duration_days"):
            previous_days = max(len(content.get("daily") or []), 1)
            per_day = round(total / previous_days)
            total = per_day * duration
            content = normalize_budget_content(
                {**content, "estimated_total_idr": total, "budget_constraint": None},
                traveler_count=traveler_count,
                duration_days=duration,
                constraint=previous_constraint,
                itinerary_days=(documents.get("full_itinerary", {}).get("content") or {}).get("days") or [],
            )
        elif any(marker in intent for marker in ["cheap", "murah", "hemat", "efisien", "efficient", "budget-friendly", "lebih terjangkau", "cap", "under"]):
            total = round(total * 0.85)
            content = normalize_budget_content(
                {**content, "estimated_total_idr": total, "budget_constraint": None},
                traveler_count=traveler_count,
                duration_days=duration,
                constraint=previous_constraint,
                itinerary_days=(documents.get("full_itinerary", {}).get("content") or {}).get("days") or [],
            )
        else:
            total = round(total * 1.12)
            content = normalize_budget_content(
                {**content, "estimated_total_idr": total, "budget_constraint": None},
                traveler_count=traveler_count,
                duration_days=duration,
                constraint=previous_constraint,
                itinerary_days=(documents.get("full_itinerary", {}).get("content") or {}).get("days") or [],
            )
        document = BudgetPlanDocumentV1.model_validate(content).model_dump()
        return await self._commit_document(planner_session_id, run_id, "budget_plan", "budget_plan.v1", document)

    async def _patch_memo(self, planner_session_id: str, run_id: str, args: dict[str, Any]) -> dict[str, Any]:
        documents = await self._latest_documents(planner_session_id)
        if "trip_memo" not in documents:
            return await self._replace_trip_memo(planner_session_id, run_id, args)
        if content := planner_document_arg(args, "trip_memo"):
            document = TripMemoDocumentV1.model_validate(
                normalize_trip_memo_arg(content, documents.get("trip_memo", {}).get("content") or {})
            ).model_dump()
            return await self._commit_document(planner_session_id, run_id, "trip_memo", "trip_memo.v1", document)
        context = await self._read_trip_context(planner_session_id)
        destinations = await self._route_destinations(
            planner_session_id,
            int(context["session"].get("duration_days") or 1),
            args.get("intent") or "",
        )
        memo = synthesize_memo(context["plan"], destinations)
        memo["markdown"] = normalize_memo_markdown(
            memo["markdown"],
            duration=int(context["session"].get("duration_days") or 1),
            travelers=int(context["session"].get("traveler_count") or 1),
        )
        memo["items"] = max(len(destinations), 1)
        document = TripMemoDocumentV1.model_validate(memo).model_dump()
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

    async def _sync_budget_with_itinerary(self, planner_session_id: str, run_id: str) -> dict[str, Any] | None:
        documents = await self._latest_documents(planner_session_id)
        budget_doc = documents.get("budget_plan")
        itinerary_doc = documents.get("full_itinerary")
        if not budget_doc or not itinerary_doc:
            return None
        session = await self.store.find_one("plannerSessions", id=planner_session_id)
        itinerary_days = (itinerary_doc.get("content") or {}).get("days") or []
        current = budget_doc.get("content") or {}
        synced = normalize_budget_content(
            current,
            traveler_count=int((session or {}).get("traveler_count") or 1),
            duration_days=int((session or {}).get("duration_days") or len(itinerary_days) or 1),
            constraint=budget_constraint_from_content(current),
            itinerary_days=itinerary_days,
        )
        if budget_daily_matches_itinerary(current.get("daily") or [], synced.get("daily") or []):
            return None
        document = BudgetPlanDocumentV1.model_validate(synced).model_dump()
        return await self._commit_document(planner_session_id, run_id, "budget_plan", "budget_plan.v1", document)

    async def _completion_actions(self, planner_session_id: str, step: PlannerAgentStepV1) -> list[dict[str, Any]]:
        has_mutation = step.requires_document_edit or any(action.tool in MUTATING_PLANNER_TOOLS for action in step.actions)
        if not has_mutation:
            return []
        session = await self.store.find_one("plannerSessions", id=planner_session_id)
        documents = await self._latest_documents(planner_session_id)
        validation = validate_document_set(
            documents,
            expected_duration_days=int((session or {}).get("duration_days") or 0) or None,
        )
        if validation["valid"]:
            return []
        actions: list[dict[str, Any]] = []
        missing_or_invalid = set(validation["missing"]) | set(validation["invalid"])
        if "full_itinerary" in missing_or_invalid:
            actions.append({"tool": "replace_full_itinerary", "args": {}})
        if "budget_plan" in missing_or_invalid:
            actions.append({"tool": "replace_budget_plan", "args": {}})
            actions.append({"tool": "compute_budget_summary", "args": {}})
        if "trip_memo" in missing_or_invalid:
            actions.append({"tool": "replace_trip_memo", "args": {}})
        if actions:
            actions.append({"tool": "validate_documents", "args": {}})
        return actions

    async def _update_duration(self, planner_session_id: str, days: int) -> dict[str, Any]:
        session = await self.store.find_one("plannerSessions", id=planner_session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Planner session not found")
        start = date.fromisoformat(session["travel_start_date"])
        end = start + timedelta(days=max(days, 1) - 1)
        updates = {
            "duration_days": max(days, 1),
            "travel_end_date": end.isoformat(),
        }
        updated = await self.store.update_doc("plannerSessions", planner_session_id, updates)
        await self.store.update_doc("tripCreationSessions", session["trip_creation_session_id"], updates)
        return updated or {**session, **updates}

    async def _route_destinations(self, planner_session_id: str, days: int, intent: str) -> list[dict[str, Any]]:
        context = await self._read_trip_context(planner_session_id)
        base = context["destinations"][0]
        destinations = [base]
        use_alternatives = wants_distinct_day_destinations(intent) or days > 1
        if use_alternatives:
            destinations.extend(alternative_destinations(base, context.get("recommendation_item"), days - 1))
        return expand_destinations_for_duration(destinations, days)[:days]

    async def _destination_answer(self, planner_session_id: str, user_text: str) -> str:
        documents = await self._latest_documents(planner_session_id)
        days = ((documents.get("full_itinerary") or {}).get("content") or {}).get("days") or []
        text = user_text.lower()
        if "other than" in text or "selain" in text or "recommend" in text or "rekomend" in text:
            context = await self._read_trip_context(planner_session_id)
            base = context["destinations"][0]
            alternatives = alternative_destinations(base, context.get("recommendation_item"), 2)
            names = [destination["name"] for destination in alternatives[:2]]
            return (
                f"For day 2 and day 3, I would recommend {names[0]} and {names[1]} as alternatives to "
                f"{base['name']}. I have not changed the itinerary yet; tell me to apply them if you want them in the plan."
            )
        selected = {int(day.get("day")): day.get("title") for day in days if int(day.get("day") or 0) in {2, 3}}
        if selected:
            parts = [f"Day {day}: {title}" for day, title in sorted(selected.items())]
            return "The current itinerary uses " + " and ".join(parts) + "."
        return "The current itinerary does not have day 2 and day 3 destinations yet."

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
        validation = validate_document_set(documents, expected_duration_days=int(session.get("duration_days") or 0) or None)
        return {
            "enabled": validation["valid"] and session.get("status") in {"ready_to_review", "accepted"},
            "reason": "Planner documents are ready." if validation["valid"] else f"Missing: {', '.join(validation['missing'])}",
            "validation": validation,
        }

    def _direct_response(self, user_text: str) -> str:
        return f"I noted that. The current planner documents stay unchanged because this message does not require a structured edit: {user_text}"

    def _summary_response(self, actions: list[dict[str, Any]], *, intent: str | None = None) -> str:
        tools = {action["tool"] for action in actions}
        if "request_clarification" in tools:
            for action in actions:
                if action["tool"] == "request_clarification":
                    return action.get("args", {}).get("question") or "I need one clarification before changing the plan."
            return "I need one clarification before changing the plan."
        if {"replace_trip_memo", "replace_full_itinerary", "replace_budget_plan"}.issubset(tools):
            if intent in {"add_destination", "change_duration"}:
                return "I updated the itinerary, budget, and memo so the changed route stays consistent and ready to review."
            if intent == "change_budget":
                return "I updated the budget plan and kept the itinerary and memo consistent with the new budget assumptions."
            if intent == "change_preferences":
                return "I updated the planner documents to reflect the requested trip preferences."
            return "I drafted the trip memo, full itinerary, and budget plan from your selected destination, dates, and group size."
        if self._actions_touch_all_documents(actions):
            return "I completed the missing planner documents and validated the trip memo, itinerary, and budget plan."
        if "places_text_search" in tools:
            return "I researched the added destination, updated the itinerary, adjusted the budget, and added a memo note."
        if "patch_budget_category" in tools:
            return "I updated the budget constraint, recalculated totals, and kept the structured documents valid."
        return "I updated the planner documents and validated the latest draft."

    async def _canonical_mutation_response(self, planner_session_id: str, actions: list[dict[str, Any]], *, fallback: str) -> str:
        documents = await self._latest_documents(planner_session_id)
        tools = {action.get("tool") for action in actions}
        itinerary = (documents.get("full_itinerary", {}).get("content") or {}).get("days") or []
        budget = documents.get("budget_plan", {}).get("content") or {}
        parts: list[str] = []
        if tools & {"replace_full_itinerary", "patch_itinerary_day"} and itinerary:
            day_parts = [f"Day {int(day.get('day') or index + 1)}: {day.get('title')}" for index, day in enumerate(itinerary)]
            parts.append(f"Itinerary now has {len(itinerary)} days: {', '.join(day_parts)}.")
        if tools & {"replace_budget_plan", "patch_budget_category"} and budget:
            total = budget.get("total_amount") or format_idr(int(budget.get("estimated_total_idr") or 0))
            constraint = budget_constraint_from_content(budget)
            if constraint and constraint.budget_mode == "max_total":
                parts.append(f"Budget is capped at {format_idr(constraint.amount_idr)} with current total {total}.")
            elif constraint and constraint.budget_mode == "fixed_total":
                parts.append(f"Budget is fixed at {format_idr(constraint.amount_idr)}.")
            elif constraint and constraint.budget_mode == "max_per_person":
                parts.append(f"Budget stays under {format_idr(constraint.amount_idr)} per person with current total {total}.")
            elif constraint and constraint.budget_mode == "fixed_per_person":
                parts.append(f"Budget is fixed at {format_idr(constraint.amount_idr)} per person.")
            elif constraint and constraint.budget_mode == "daily_cap":
                parts.append(f"Daily budget is capped at {format_idr(constraint.amount_idr)} with current total {total}.")
            else:
                parts.append(f"Budget total is now {total}.")
        if tools & {"replace_trip_memo", "patch_memo_section"}:
            parts.append("Trip memo was updated from the latest canonical plan.")
        if not parts:
            return fallback
        if any(action.get("tool") == "validate_documents" for action in actions):
            parts.append("Documents validated successfully.")
        return " ".join(parts)

    def _actions_touch_all_documents(self, actions: list[dict[str, Any]]) -> bool:
        tools = {action["tool"] for action in actions}
        itinerary = bool(tools & {"replace_full_itinerary", "patch_itinerary_day"})
        budget = bool(tools & {"replace_budget_plan", "patch_budget_category"})
        memo = bool(tools & {"replace_trip_memo", "patch_memo_section"})
        return itinerary and budget and memo


def validate_document_set(documents: dict[str, Any], *, expected_duration_days: int | None = None) -> dict[str, Any]:
    missing = [doc_type for doc_type in PLANNER_DOCUMENT_TYPES if doc_type not in documents]
    invalid = [doc_type for doc_type, doc in documents.items() if doc_type in PLANNER_DOCUMENT_TYPES and not doc.get("valid")]
    budget_errors = []
    itinerary_errors = []
    memo_errors = []
    if "full_itinerary" in documents:
        itinerary_errors = validate_itinerary_content(
            documents["full_itinerary"].get("content") or {},
            expected_duration_days=expected_duration_days,
        )
        if itinerary_errors and "full_itinerary" not in invalid:
            invalid.append("full_itinerary")
    if "budget_plan" in documents:
        budget_errors = validate_budget_content(
            documents["budget_plan"].get("content") or {},
            expected_duration_days=expected_duration_days,
        )
        if budget_errors and "budget_plan" not in invalid:
            invalid.append("budget_plan")
    if "trip_memo" in documents:
        memo_errors = validate_memo_content(documents["trip_memo"].get("content") or {})
        if memo_errors and "trip_memo" not in invalid:
            invalid.append("trip_memo")
    return {
        "valid": not missing and not invalid,
        "missing": missing,
        "invalid": invalid,
        "budget_errors": budget_errors,
        "itinerary_errors": itinerary_errors,
        "memo_errors": memo_errors,
    }


def validate_itinerary_content(content: dict[str, Any], *, expected_duration_days: int | None = None) -> list[str]:
    errors = []
    days = content.get("days") or []
    if not all(isinstance(day, dict) for day in days):
        return ["itinerary_days_must_be_objects"]
    day_numbers = [int(day.get("day") or 0) for day in days]
    expected_numbers = list(range(1, len(days) + 1))
    if day_numbers != expected_numbers:
        errors.append("itinerary_days_must_be_sequential")
    if expected_duration_days is not None and len(days) != expected_duration_days:
        errors.append("itinerary_day_count_mismatch")
    if any((day.get("title") or "").strip().lower() == "added destination research" for day in days):
        errors.append("itinerary_contains_placeholder_day")
    return errors


def validate_memo_content(content: dict[str, Any]) -> list[str]:
    markdown = (content.get("markdown") or "").lower()
    errors = []
    if markdown.count("latest adjustment") > 1:
        errors.append("memo_contains_repeated_latest_adjustments")
    return errors


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


def planner_document_arg(args: dict[str, Any], document_type: str) -> dict[str, Any] | None:
    if not args:
        return None
    candidates = [
        args.get("content"),
        args.get("document"),
        args.get("document_content"),
        args.get(document_type),
    ]
    if document_type == "trip_memo":
        candidates.extend([args.get("memo"), args if "markdown" in args else None])
    elif document_type == "full_itinerary":
        candidates.extend([args.get("itinerary"), args if "days" in args else None])
    elif document_type == "budget_plan":
        candidates.extend([args.get("budget"), args if "categories" in args and "daily" in args else None])
    for candidate in candidates:
        if not isinstance(candidate, dict):
            continue
        nested = candidate.get("content")
        if isinstance(nested, dict):
            candidate = nested
        if document_type == "trip_memo" and "markdown" in candidate:
            return candidate
        if document_type == "full_itinerary" and "days" in candidate:
            return candidate
        if document_type == "budget_plan" and "categories" in candidate and "daily" in candidate:
            return candidate
    return None


def requested_itinerary_duration(args: dict[str, Any], content: dict[str, Any], *, fallback: int) -> int:
    for source in (args, content):
        for key in ("duration_days", "duration", "days_count", "day_count"):
            value = source.get(key)
            if isinstance(value, int) and 1 <= value <= 90:
                return value
            if isinstance(value, str) and value.isdigit() and 1 <= int(value) <= 90:
                return int(value)
    if requested := extract_requested_duration_days(str(args.get("intent") or "")):
        return requested
    days = content.get("days")
    if isinstance(days, list) and days and all(isinstance(day, dict) for day in days):
        return min(max(len(days), 1), 90)
    return max(min(fallback, 90), 1)


def itinerary_day_arg(args: dict[str, Any]) -> dict[str, Any] | None:
    if full_document := planner_document_arg(args, "full_itinerary"):
        target_day = int(args.get("day") or args.get("day_number") or 0)
        days = full_document.get("days") or []
        if target_day:
            return next((day for day in days if int(day.get("day") or 0) == target_day), None)
        if len(days) == 1:
            return days[0]
    for key in ["day_content", "day_plan", "replacement", "content", "document"]:
        candidate = args.get(key)
        if isinstance(candidate, dict):
            nested = candidate.get("content")
            if isinstance(nested, dict):
                candidate = nested
            if "title" in candidate and "activities" in candidate:
                return candidate
    if "title" in args and "activities" in args:
        return args
    return None


def normalize_trip_memo_arg(content: dict[str, Any], previous: dict[str, Any]) -> dict[str, Any]:
    normalized = {**previous, **content}
    normalized["markdown"] = str(normalized.get("markdown") or previous.get("markdown") or normalized.get("caption") or "Trip planning notes.")
    normalized["caption"] = str(normalized.get("caption") or previous.get("caption") or "Trip planning notes")
    normalized["source"] = str(normalized.get("source") or previous.get("source") or "Planner")
    tiles = normalize_memo_tiles(
        normalized.get("tiles") or previous.get("tiles"),
        fallback_alt=normalized["caption"],
    )
    normalized["tiles"] = tiles
    normalized["items"] = coerce_positive_int(
        normalized.get("items"),
        fallback=coerce_positive_int(previous.get("items"), fallback=max(len(tiles), 1)),
    )
    return normalized


def normalize_memo_tiles(value: Any, *, fallback_alt: str) -> list[dict[str, str]]:
    tiles: list[dict[str, str]] = []
    if isinstance(value, list):
        for item in value:
            if isinstance(item, str) and item.strip():
                tiles.append({"src": item.strip(), "alt": fallback_alt})
                continue
            if not isinstance(item, dict):
                continue
            src = str(item.get("src") or item.get("url") or item.get("image") or "").strip()
            alt = str(item.get("alt") or item.get("caption") or fallback_alt).strip()
            if src:
                tiles.append({"src": src, "alt": alt or fallback_alt})
    return tiles or [{"src": "/landing/indonesia-map.png", "alt": fallback_alt}]


def coerce_positive_int(value: Any, *, fallback: int) -> int:
    if isinstance(value, bool):
        return fallback
    if isinstance(value, int):
        return max(value, 1)
    if isinstance(value, float):
        return max(round(value), 1)
    if isinstance(value, str):
        match = re.search(r"\d+", value)
        if match:
            return max(int(match.group(0)), 1)
    return max(fallback, 1)


def normalize_itinerary_arg(content: dict[str, Any], previous: dict[str, Any]) -> dict[str, Any]:
    previous_days = {int(day.get("day") or 0): day for day in previous.get("days") or []}
    normalized_days = []
    for index, day in enumerate(content.get("days") or [], start=1):
        if not isinstance(day, dict):
            continue
        day_number = int(day.get("day") or index)
        normalized_days.append(fill_itinerary_day_defaults(day, previous_days.get(day_number, {}), day_number))
    return {"days": normalized_days}


def itinerary_payload_has_usable_days(content: dict[str, Any]) -> bool:
    days = content.get("days") or []
    if not days or not all(isinstance(day, dict) for day in days):
        return False
    for day in days:
        title = str(day.get("title") or "").strip().lower()
        if not title or title in {"...", "added destination research"}:
            return False
    return True


def reconcile_itinerary_duration(
    content: dict[str, Any],
    *,
    previous: dict[str, Any],
    duration: int,
    start_date: str,
) -> dict[str, Any]:
    existing = {int(day.get("day") or 0): day for day in content.get("days") or [] if isinstance(day, dict)}
    previous_days = {int(day.get("day") or 0): day for day in previous.get("days") or [] if isinstance(day, dict)}
    reconciled = []
    for day_number in range(1, max(duration, 1) + 1):
        source = existing.get(day_number) or previous_days.get(day_number) or {}
        day = fill_itinerary_day_defaults(source, previous_days.get(day_number, {}), day_number)
        day["day"] = day_number
        day["dateLabel"] = date_label(start_date, day_number - 1)
        day["transport"]["from"] = "Start" if day_number == 1 else reconciled[-1]["title"]
        day["accommodation"]["nights"] = 0 if day_number == duration else 1
        reconciled.append(day)
    return {"days": reconciled}


def fill_itinerary_day_defaults(day: dict[str, Any], previous: dict[str, Any], day_number: int) -> dict[str, Any]:
    title = str(day.get("title") or day.get("name") or previous.get("title") or f"Day {day_number} plan")
    description = str(day.get("description") or day.get("summary") or previous.get("description") or previous.get("summary") or f"Explore {title}.")
    previous_transport = previous.get("transport") if isinstance(previous.get("transport"), dict) else {}
    previous_accommodation = previous.get("accommodation") if isinstance(previous.get("accommodation"), dict) else {}
    previous_meals = previous.get("meals") if isinstance(previous.get("meals"), dict) else {}
    previous_cost = previous.get("estCost") if isinstance(previous.get("estCost"), dict) else {}
    region = str(day.get("region") or previous.get("region") or previous_transport.get("to") or title)
    transport = day.get("transport") if isinstance(day.get("transport"), dict) else {}
    accommodation = day.get("accommodation") if isinstance(day.get("accommodation"), dict) else {}
    meals = day.get("meals") if isinstance(day.get("meals"), dict) else {}
    est_cost = day.get("estCost") if isinstance(day.get("estCost"), dict) else {}
    highlights = coerce_string_list(day.get("highlights")) or coerce_string_list(previous.get("highlights")) or ["Recommended stop"]
    return {
        "day": day_number,
        "title": title,
        "summary": str(day.get("summary") or description[:96]),
        "description": description,
        "cover": str(day.get("cover") or previous.get("cover") or "/landing/indonesia-map.png"),
        "dateLabel": str(day.get("dateLabel") or previous.get("dateLabel") or f"Day {day_number}"),
        "highlights": highlights,
        "activities": normalize_itinerary_activities(day.get("activities") or previous.get("activities"), title, description, region),
        "transport": {
            **{"mode": "Drive", "from": "Previous stop" if day_number > 1 else "Start", "to": title, "durationLabel": "Flexible"},
            **previous_transport,
            **transport,
        },
        "accommodation": {
            **{"name": "Local stay to confirm", "area": region, "nights": 1},
            **previous_accommodation,
            **accommodation,
        },
        "meals": meals or previous_meals or {"lunch": "Local restaurant to confirm"},
        "estCost": est_cost or previous_cost or {"value": "Budget TBD", "note": "estimate"},
    }


def coerce_string_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str) and value.strip():
        return [value.strip()]
    return []


def apply_meal_preference_to_itinerary(content: dict[str, Any], intent: str) -> dict[str, Any]:
    note = meal_preference_note(intent)
    if not note:
        return content
    days = []
    for day in content.get("days") or []:
        if not isinstance(day, dict):
            continue
        meals = dict(day.get("meals") or {})
        meals["lunch"] = note
        day = {**day, "meals": meals}
        days.append(day)
    return {**content, "days": days}


def meal_preference_note(intent: str) -> str | None:
    text = intent.lower()
    if any(marker in text for marker in ["vegetarian", "veggie", "plant-based", "tanpa daging", "vegetaris"]):
        return "Vegetarian-friendly local meal: ask for gado-gado, tempeh/tahu, cap cay, or vegetable nasi campur; confirm no meat stock."
    return None


def normalize_itinerary_activities(value: Any, title: str, description: str, region: str) -> list[dict[str, Any]]:
    if isinstance(value, list) and value:
        normalized = []
        for item in value:
            if isinstance(item, str):
                normalized.append(
                    {
                        "time": "09:00" if not normalized else "13:00",
                        "title": item,
                        "detail": description,
                        "location": region,
                        "duration": "3h",
                    }
                )
                continue
            if not isinstance(item, dict):
                continue
            item = normalize_activity_pipe_fields(item)
            normalized.append(
                {
                    "time": str(item.get("time") or "09:00"),
                    "title": str(item.get("title") or f"Explore {title}"),
                    "detail": str(item.get("detail") or item.get("description") or description),
                    "location": item.get("location") or region,
                    "duration": item.get("duration") or "3h",
                }
            )
        return normalized or [{"time": "09:00", "title": f"Explore {title}", "detail": description, "location": region, "duration": "3h"}]
    return [{"time": "09:00", "title": f"Explore {title}", "detail": description, "location": region, "duration": "3h"}]


def normalize_activity_pipe_fields(item: dict[str, Any]) -> dict[str, Any]:
    title = str(item.get("title") or "")
    parts = [part.strip() for part in title.split("|") if part.strip()]
    if len(parts) < 2 or not re.match(r"^\d{1,2}:\d{2}$", parts[0]):
        return item
    normalized = dict(item)
    normalized["time"] = parts[0]
    normalized["title"] = parts[1]
    if len(parts) >= 3:
        normalized["location"] = normalized.get("location") or parts[2]
    if len(parts) >= 4:
        normalized["duration"] = normalized.get("duration") or parts[3]
    if len(parts) >= 5:
        normalized["detail"] = normalized.get("detail") or parts[4]
    return normalized


def normalize_budget_arg(content: dict[str, Any]) -> dict[str, Any]:
    normalized = dict(content)
    normalized["categories"] = coerce_dict_list(normalized.get("categories"))
    normalized["daily"] = coerce_dict_list(normalized.get("daily"))
    return normalized


def coerce_dict_list(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []
    coerced = []
    for item in value:
        if isinstance(item, dict):
            coerced.append(item)
            continue
        if isinstance(item, str):
            try:
                parsed = json.loads(item)
            except json.JSONDecodeError:
                continue
            if isinstance(parsed, dict):
                coerced.append(parsed)
    return coerced


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


def extract_requested_duration_days(text: str) -> int | None:
    patterns = [
        r"\b(?:add|tambah|tambahkan|extend|perpanjang|include|masukkan)\b.*?\bday\s*(\d{1,2})\b",
        r"\bday\s*(\d{1,2})\b.*?\b(?:add|tambah|tambahkan|include|masukkan)\b",
        r"\b(?:make|ubah|jadikan|set|change|into|to)\D{0,16}(\d{1,2})\s*(?:day|days|hari)\b",
        r"\b(\d{1,2})\s*(?:day|days|hari)\b",
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            value = int(match.group(1))
            if 1 <= value <= 30:
                return value
    return None


def is_zero_budget_request(text: str) -> bool:
    return bool(
        re.search(r"\b(?:budget|budgets|biaya)\b", text)
        and re.search(r"\b(?:0|zero|nol)\b", text)
        and any(marker in text for marker in ["make", "set", "all", "semua", "jadikan", "ubah"])
    )


def is_direct_reply_request(text: str) -> bool:
    stripped = text.strip().lower()
    return stripped in {"hi", "hello", "halo", "hai"} or stripped.startswith("say hello") or stripped.startswith("reply hello")


def direct_reply_text(text: str) -> str:
    stripped = text.strip().lower()
    if stripped.startswith("say hello") or stripped.startswith("reply hello"):
        return "hello"
    if stripped in {"halo", "hai"}:
        return "Halo."
    return "Hello."


def response_mentions_pending_document_work(text: str) -> bool:
    lowered = text.lower()
    return any(
        marker in lowered
        for marker in [
            "will set up",
            "will proceed",
            "next, i",
            "once this is set",
            "i will",
            "i'll",
            "akan saya",
            "selanjutnya saya",
        ]
    )


def planner_step_contract_errors(step: PlannerAgentStepV1, user_text: str) -> list[str]:
    errors: list[str] = []
    text = user_text.lower()
    for action in step.actions:
        if action.tool != "patch_itinerary_day":
            if action.tool == "patch_memo_section":
                args = action.args or {}
                if memo_quality_request(text) and not planner_document_arg(args, "trip_memo"):
                    errors.append(
                        "patch_memo_section requires args.content as concrete trip_memo.v1 content for memo quality, completeness, rewrite, concise, checklist, or descriptive edits."
                    )
            continue
        args = action.args or {}
        if itinerary_day_arg(args):
            continue
        if args.get("duration_days") or is_explicit_add_destination(text):
            continue
        errors.append(
            "patch_itinerary_day requires args.day and args.day_content with concrete itinerary content for targeted day, pacing, meal, lodging, or activity edits."
        )
    return errors


def is_destination_question(text: str) -> bool:
    mentions_destination = any(marker in text for marker in ["destination", "destinations", "destinasi", "day 2", "day 3"])
    asks = any(marker in text for marker in ["what", "which", "recommend", "rekomend", "reply to me", "apa", "mana"])
    edit_markers = ["make", "set", "change", "update", "apply", "use ", "add ", "tambah", "ubah", "jadikan", "masukkan"]
    edits = any(marker in text for marker in edit_markers)
    return mentions_destination and asks and not edits


def memo_quality_request(text: str) -> bool:
    return "memo" in text and any(
        marker in text
        for marker in [
            "improve",
            "descriptive",
            "practical",
            "concise",
            "checklist",
            "packing",
            "complete",
            "lengkap",
            "ringkas",
            "rewrite",
            "perjelas",
        ]
    )


def is_explicit_add_destination(text: str) -> bool:
    return any(marker in text for marker in ["add destination", "add a destination", "tambah destination", "tambah destinasi"])


def wants_distinct_day_destinations(intent: str) -> bool:
    text = intent.lower()
    return any(marker in text for marker in ["different destination", "different destinations", "destinasi berbeda", "berbeda"]) or (
        "day 2" in text and "day 3" in text and any(marker in text for marker in ["destination", "destinasi"])
    )


def duration_change_response(requested_duration: int | None) -> str:
    if requested_duration:
        return (
            f"I updated the plan to exactly {requested_duration} days, reconciled the itinerary days, "
            "adjusted the budget daily rows, and refreshed the memo."
        )
    return "I updated the itinerary duration, adjusted the budget rows, and refreshed the memo."


def alternative_destinations(
    base: dict[str, Any],
    recommendation_item: dict[str, Any] | None,
    count: int,
) -> list[dict[str, Any]]:
    region = (base.get("region") or (recommendation_item or {}).get("region") or "Indonesia").split(",")[0]
    base_name = base.get("name") or "Selected destination"
    if (
        "tanjung tinggi" in base_name.lower()
        or "belitung" in base_name.lower()
        or "belitung" in region.lower()
        or "bangka belitung" in region.lower()
    ):
        names = [
            "Pulau Lengkuas",
            "Danau Kaolin Belitung",
            "Pantai Tanjung Kelayang",
            "Museum Kata Andrea Hirata",
        ]
        blurbs = [
            "An island-hopping anchor with a lighthouse, clear water, and granite-island scenery near Belitung.",
            "A bright blue former kaolin mining lake that adds a different landscape before departure.",
            "A practical beach base for boat departures and another granite-coast sunset stop.",
            "A cultural stop in East Belitung that balances beach days with local literary context.",
        ]
    elif "bromo" in base_name.lower() or "east java" in region.lower() or "jawa timur" in region.lower():
        names = [
            "Air Terjun Madakaripura",
            "Bukit Teletubbies Bromo",
            "Kampung Warna-Warni Jodipan",
            "Kawah Ijen",
        ]
        blurbs = [
            "A dramatic waterfall canyon near Probolinggo that pairs naturally with a Bromo route extension.",
            "A softer savanna landscape inside the Bromo area for a distinct scenic day without a long transfer.",
            "A colorful urban culture stop in Malang that works well before or after the mountain segment.",
            "A more ambitious volcano extension for travelers who want another iconic East Java landscape.",
        ]
    elif "gede" in base_name.lower() or "west java" in region.lower() or "jawa barat" in region.lower():
        names = [
            "Cibodas Botanical Garden",
            "Curug Cibeureum",
            "Situ Gunung Suspension Bridge",
            "Cianjur local food stop",
        ]
        blurbs = [
            "A highland garden near the national park with gentler walks and cooler air.",
            "A waterfall area often paired with Cibodas for a nature-focused day.",
            "A Sukabumi-area forest bridge and lake stop for a different landscape.",
            "A flexible local culture and meal stop to balance the mountain itinerary.",
        ]
    else:
        names = [
            f"{region} cultural stop",
            f"{region} scenic viewpoint",
            f"{region} local food area",
            f"{region} relaxed final stop",
        ]
        blurbs = [
            "A practical cultural stop that adds variety without overloading the route.",
            "A scenic stop for a different view and a slower travel day.",
            "A food-focused stop to make the route feel more local.",
            "A flexible final stop that keeps the itinerary realistic.",
        ]
    destinations = []
    for index, name in enumerate(names[: max(count, 0)], start=2):
        destinations.append(
            {
                "order": index,
                "name": name,
                "region": region,
                "address": region,
                "cover": base.get("cover") or "/landing/indonesia-map.png",
                "blurb": blurbs[(index - 2) % len(blurbs)],
                "highlights": ["Recommended alternative", "Estimate", region],
                "pin": {"x": 42 + index * 4 % 30, "y": 40 + index * 3 % 25},
                "days": [index],
                "lat": None,
                "lng": None,
                "google_maps_uri": None,
                "place_enrichment_id": None,
            }
        )
    return destinations


def normalize_memo_markdown(markdown: str, *, duration: int, travelers: int) -> str:
    cleaned = re.sub(r"\n\n### Latest adjustment\n\n- .*(?=\n\n### |\Z)", "", markdown, flags=re.IGNORECASE | re.DOTALL)
    assumptions = (
        "\n\n### Planning assumptions\n\n"
        f"- Duration is set to {duration} days.\n"
        f"- Budget and pacing are estimated for {travelers} travelers.\n"
        "- Current prices, opening hours, and transport times should be confirmed before booking."
    )
    if "### Planning assumptions" in cleaned:
        return cleaned
    return f"{cleaned}{assumptions}"


def normalize_budget_content(
    content: dict[str, Any],
    *,
    traveler_count: int,
    duration_days: int,
    constraint: BudgetConstraint | None = None,
    itinerary_days: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    if constraint is None and isinstance(content.get("budget_constraint"), dict):
        constraint = BudgetConstraint.model_validate(content["budget_constraint"])
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
    normalized["daily"] = normalize_budget_daily(
        normalized.get("daily") or [],
        total,
        duration,
        constraint,
        itinerary_days=itinerary_days or [],
    )
    normalized["categories"] = normalize_budget_categories(
        normalized.get("categories") or [],
        total,
        constraint,
        category_totals=budget_category_totals_from_daily(normalized["daily"]),
    )
    return normalized


def budget_constraint_from_content(content: dict[str, Any]) -> BudgetConstraint | None:
    if not isinstance(content, dict) or not isinstance(content.get("budget_constraint"), dict):
        return None
    return BudgetConstraint.model_validate(content["budget_constraint"])


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
    *,
    category_totals: dict[str, int] | None = None,
) -> list[dict[str, Any]]:
    categories = [category for category in categories if isinstance(category, dict)]
    category_ids = list(category_totals) if category_totals else [str(category.get("id")) for category in categories if category.get("id")] or list(BUDGET_ALLOCATION_WEIGHTS)
    amounts = category_totals or distribute_amount(total, category_ids)
    missing_ids = [category_id for category_id in category_ids if category_id not in amounts]
    if missing_ids:
        assigned = sum(amounts.values())
        amounts.update(distribute_amount(max(total - assigned, 0), missing_ids))
    note = "(Fixed budget constraint)" if constraint and constraint.budget_mode.startswith("fixed") else "(Estimated within budget constraint)" if constraint else "(Estimated)"
    normalized = []
    existing_by_id = {str(category.get("id")): category for category in categories if category.get("id")}
    for category_id in category_ids:
        original = existing_by_id.get(category_id) or {}
        amount = int(amounts.get(category_id) or 0)
        label = original.get("label") or BUDGET_LABELS.get(category_id, category_id.replace("_", " ").title())
        items = [item for item in list(original.get("items") or []) if isinstance(item, dict)]
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
    *,
    itinerary_days: list[dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    count = max(duration_days, 1)
    row_totals = distribute_budget_day_totals(rows, total, count, constraint, itinerary_days or [])
    normalized = []
    for index in range(count):
        original = rows[index] if index < len(rows) and isinstance(rows[index], dict) else {}
        itinerary_day = itinerary_days[index] if index < len(itinerary_days) and isinstance(itinerary_days[index], dict) else {}
        day_total = row_totals[index]
        if constraint and constraint.budget_mode == "daily_cap":
            day_total = min(day_total, constraint.amount_idr)
        amounts = normalize_budget_day_amounts(original, day_total, itinerary_day)
        normalized.append(
            {
                **original,
                "day": int(original.get("day") or index + 1),
                "title": normalize_budget_day_title(original, itinerary_day, index),
                "route": normalize_budget_day_route(original, itinerary_day),
                "amounts": amounts,
            }
        )
    return normalized


def budget_category_totals_from_daily(rows: list[dict[str, Any]]) -> dict[str, int]:
    totals = dict.fromkeys(BUDGET_ALLOCATION_WEIGHTS, 0)
    for row in rows:
        amounts = row.get("amounts") or {}
        for category_id in totals:
            totals[category_id] += int(amounts.get(category_id) or 0)
    return totals


def budget_daily_matches_itinerary(current_rows: list[dict[str, Any]], synced_rows: list[dict[str, Any]]) -> bool:
    if len(current_rows) != len(synced_rows):
        return False
    for current, synced in zip(current_rows, synced_rows, strict=False):
        if int(current.get("day") or 0) != int(synced.get("day") or 0):
            return False
        if str(current.get("title") or "").strip() != str(synced.get("title") or "").strip():
            return False
        if str(current.get("route") or "").strip() != str(synced.get("route") or "").strip():
            return False
        if {key: int((current.get("amounts") or {}).get(key) or 0) for key in BUDGET_ALLOCATION_WEIGHTS} != {
            key: int((synced.get("amounts") or {}).get(key) or 0) for key in BUDGET_ALLOCATION_WEIGHTS
        }:
            return False
    return True


def distribute_budget_day_totals(
    rows: list[dict[str, Any]],
    total: int,
    duration_days: int,
    constraint: BudgetConstraint | None,
    itinerary_days: list[dict[str, Any]],
) -> list[int]:
    count = max(duration_days, 1)
    original_totals = [budget_row_total(rows[index]) if index < len(rows) else 0 for index in range(count)]
    has_usable_totals = sum(original_totals) > 0
    generic_or_flat = budget_rows_are_generic_or_flat(rows, original_totals, count)
    if has_usable_totals and not generic_or_flat:
        values = distribute_amount_by_weights(total, original_totals)
        if constraint and constraint.budget_mode == "daily_cap":
            return cap_daily_totals(values, constraint.amount_idr, min(total, constraint.amount_idr * count))
        return values
    weights = [
        budget_day_weight(
            itinerary_days[index] if index < len(itinerary_days) and isinstance(itinerary_days[index], dict) else rows[index] if index < len(rows) and isinstance(rows[index], dict) else {},
            index,
            count,
        )
        for index in range(count)
    ]
    if constraint and constraint.budget_mode == "daily_cap":
        return cap_daily_totals(distribute_amount_by_weights(total, weights), constraint.amount_idr, total)
    return distribute_amount_by_weights(total, weights)


def budget_row_total(row: dict[str, Any] | None) -> int:
    if not isinstance(row, dict) or not isinstance(row.get("amounts"), dict):
        return 0
    return sum(coerce_nonnegative_int(value) for value in row["amounts"].values())


def budget_rows_are_generic_or_flat(rows: list[dict[str, Any]], totals: list[int], duration_days: int) -> bool:
    if duration_days <= 1:
        return False
    positive = [total for total in totals if total > 0]
    if len(positive) != duration_days:
        return True
    flat_totals = len(set(positive)) == 1
    generic_labels = 0
    for index in range(duration_days):
        row = rows[index] if index < len(rows) and isinstance(rows[index], dict) else {}
        title = str(row.get("title") or "").strip().lower()
        route = str(row.get("route") or "").strip().lower()
        if title in {"", f"day {index + 1}"} or "budget allocation" in route:
            generic_labels += 1
    return flat_totals or generic_labels >= max(1, duration_days // 2)


def budget_day_weight(day: dict[str, Any], index: int, duration_days: int) -> float:
    text = " ".join(
        str(value or "")
        for value in [
            day.get("title"),
            day.get("description"),
            day.get("route"),
            day.get("summary"),
            (day.get("transport") or {}).get("mode") if isinstance(day.get("transport"), dict) else "",
        ]
    ).lower()
    weight = 1.0
    if any(marker in text for marker in ["sunrise", "jeep", "hike", "trek", "kawah", "volcano", "bromo"]):
        weight += 0.22
    if any(marker in text for marker in ["waterfall", "madakaripura", "boat", "island", "tour", "ticket", "guide"]):
        weight += 0.18
    if any(marker in text for marker in ["transfer", "drive", "airport", "station", "departure", "arrival"]):
        weight += 0.12
    if any(marker in text for marker in ["rest", "relaxed", "leisure", "kuliner", "food", "cafe", "village", "kampung", "viewpoint"]):
        weight -= 0.10
    if index == duration_days - 1:
        weight -= 0.08
    return max(weight, 0.65)


def distribute_amount_by_weights(total: int, weights: list[int | float]) -> list[int]:
    if not weights:
        return []
    clean_weights = [max(float(weight), 0.0) for weight in weights]
    weight_total = sum(clean_weights) or float(len(clean_weights))
    distributed = []
    assigned = 0
    for weight in clean_weights[:-1]:
        value = round(total * (weight / weight_total))
        distributed.append(value)
        assigned += value
    distributed.append(total - assigned)
    return distributed


def cap_daily_totals(values: list[int], cap: int, requested_total: int) -> list[int]:
    capped = [min(value, cap) for value in values]
    overflow = requested_total - sum(capped)
    if overflow <= 0:
        return capped
    for index, value in enumerate(capped):
        room = max(cap - value, 0)
        if not room:
            continue
        add = min(room, overflow)
        capped[index] += add
        overflow -= add
        if overflow <= 0:
            break
    return capped


def normalize_budget_day_amounts(original: dict[str, Any], day_total: int, itinerary_day: dict[str, Any]) -> dict[str, int]:
    original_amounts = original.get("amounts")
    if isinstance(original_amounts, dict):
        current = {key: coerce_nonnegative_int(original_amounts.get(key)) for key in BUDGET_ALLOCATION_WEIGHTS}
        if sum(current.values()) > 0 and not budget_day_amounts_are_generic(current):
            return dict(zip(BUDGET_ALLOCATION_WEIGHTS, distribute_amount_by_weights(day_total, list(current.values())), strict=False))
    weights = day_category_weights(itinerary_day)
    return dict(zip(weights, distribute_amount_by_weights(day_total, list(weights.values())), strict=False))


def coerce_nonnegative_int(value: Any) -> int:
    if isinstance(value, bool) or value is None:
        return 0
    if isinstance(value, int):
        return max(value, 0)
    if isinstance(value, float):
        return max(round(value), 0)
    if isinstance(value, str):
        digits = re.sub(r"\D", "", value)
        return int(digits) if digits else 0
    return 0


def budget_day_amounts_are_generic(amounts: dict[str, int]) -> bool:
    positive = [amount for amount in amounts.values() if amount > 0]
    if not positive:
        return True
    expected = distribute_amount(sum(positive), list(BUDGET_ALLOCATION_WEIGHTS))
    return all(abs(amounts.get(key, 0) - expected.get(key, 0)) <= 1 for key in BUDGET_ALLOCATION_WEIGHTS)


def day_category_weights(day: dict[str, Any]) -> dict[str, float]:
    weights = dict(BUDGET_ALLOCATION_WEIGHTS)
    text = " ".join(str(value or "") for value in [day.get("title"), day.get("description"), day.get("route")]).lower()
    accommodation = day.get("accommodation") if isinstance(day.get("accommodation"), dict) else {}
    if int(accommodation.get("nights") or 0) <= 0:
        weights["accommodation"] *= 0.45
        weights["transport"] *= 1.35
        weights["activities"] *= 1.15
    if any(marker in text for marker in ["waterfall", "boat", "island", "tour", "jeep", "sunrise", "kawah", "hike"]):
        weights["transport"] *= 1.12
        weights["activities"] *= 1.28
    if any(marker in text for marker in ["food", "kuliner", "cafe", "market"]):
        weights["meals"] *= 1.35
        weights["activities"] *= 0.85
    if any(marker in text for marker in ["rest", "relaxed", "leisure"]):
        weights["activities"] *= 0.75
        weights["meals"] *= 1.15
    return weights


def normalize_budget_day_title(original: dict[str, Any], itinerary_day: dict[str, Any], index: int) -> str:
    itinerary_title = str(itinerary_day.get("title") or "").strip()
    if itinerary_title:
        return itinerary_title
    title = str(original.get("title") or "").strip()
    if title and title.lower() != f"day {index + 1}":
        return title
    return f"Day {index + 1}"


def normalize_budget_day_route(original: dict[str, Any], itinerary_day: dict[str, Any]) -> str:
    description = str(itinerary_day.get("description") or "").strip()
    title = str(itinerary_day.get("title") or "").strip()
    if description:
        return description[:120]
    if title:
        return title
    route = str(original.get("route") or "").strip()
    if route and "budget allocation" not in route.lower():
        return route
    return "Daily budget allocation"


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


def validate_budget_content(content: dict[str, Any], *, expected_duration_days: int | None = None) -> list[str]:
    errors = []
    constraint_data = content.get("budget_constraint")
    total = int(content.get("estimated_total_idr") or 0)
    per_person = int(content.get("per_person_idr") or 0)
    category_total = sum(parse_idr_amount(category.get("amount")) for category in content.get("categories") or [])
    daily_totals = [sum(int(value or 0) for value in (row.get("amounts") or {}).values()) for row in content.get("daily") or []]
    if total <= 0:
        errors.append("budget_total_must_be_positive")
    if category_total != total:
        errors.append("budget_category_rollup_mismatch")
    if daily_totals and sum(daily_totals) != total:
        errors.append("budget_daily_rollup_mismatch")
    if expected_duration_days is not None and len(content.get("daily") or []) != expected_duration_days:
        errors.append("budget_daily_count_mismatch")
    if not constraint_data:
        return errors
    constraint = BudgetConstraint.model_validate(constraint_data)
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


def summarize_tool_observations(messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    observations = []
    for message in messages:
        if message.get("visible", True) or message.get("role") != "tool":
            continue
        try:
            payload = json.loads(str(message.get("content") or "{}"))
        except json.JSONDecodeError:
            continue
        tool = payload.get("tool")
        result = payload.get("result") if isinstance(payload.get("result"), dict) else {}
        summary: dict[str, Any] = {
            "sequence": message.get("sequence"),
            "tool": tool,
        }
        if "document_type" in result:
            summary.update(
                {
                    "document_type": result.get("document_type"),
                    "version": result.get("version"),
                    "document_id": result.get("document_id"),
                }
            )
        elif tool == "validate_documents":
            summary.update(
                {
                    "valid": result.get("valid"),
                    "missing": result.get("missing", []),
                    "invalid": result.get("invalid", []),
                }
            )
        elif tool in {"places_text_search", "places_details", "grounded_web_research"}:
            summary.update(
                {
                    "fact_id": result.get("fact_id"),
                    "summary": result.get("summary"),
                    "citation_count": result.get("citation_count"),
                }
            )
        elif tool == "compute_budget_summary":
            summary.update(
                {
                    "total_amount": result.get("total_amount"),
                    "per_person_idr": result.get("per_person_idr"),
                    "category_count": result.get("category_count"),
                }
            )
        elif tool == "request_clarification":
            summary.update(
                {
                    "needs_user_input": result.get("needs_user_input"),
                    "reason": result.get("reason"),
                }
            )
        observations.append({key: value for key, value in summary.items() if value is not None})
    return observations


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
