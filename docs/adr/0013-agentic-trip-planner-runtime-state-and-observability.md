# ADR 0013: Agentic Trip Planner Runtime, State, and Observability

## Status

Accepted.

## Context

The previous planner implementation was a deterministic preview and scripted frontend chat. Phase 11 requires a real planner boundary where a selected Flow 2 destination, trip dates, and traveler count create a stateful planner session. The planner must draft and revise three structured documents: `trip_memo.v1`, `full_itinerary.v1`, and `budget_plan.v1`.

The design references `pi-agent-core` for durable state, tool lifecycle events, and multi-turn execution boundaries, and `opencode` for max-step controls, scoped tools, and frontend timeline reduction. SnapTrip is Python/FastAPI-native, so the runtime is implemented inside backend services rather than importing a TypeScript agent runtime.

## Decision

SnapTrip will use a backend-owned planner session model with append-only operational collections:

- `plannerSessions`
- `plannerMessages`
- `plannerRuns`
- `plannerEvents`
- `plannerDocuments`
- `plannerDocumentVersions`
- `plannerResearchFacts`

Each user or auto-triggered planner operation creates a run. A run may execute multiple internal tool turns and emits replayable sanitized events for the frontend timeline. The canonical documents are full schema-validated writes or targeted validated patches. Last valid documents are preserved when a tool or validation step fails.

Planner entry now requires exactly one selected recommendation, `travel_start_date`, `travel_end_date`, and `traveler_count`. The first planner message is auto-created as:

```text
Plan me a {duration} day {destination} trip for {traveler_count} people.
```

The initial tool set is:

- `read_trip_context`
- `read_documents`
- `replace_trip_memo`
- `replace_full_itinerary`
- `replace_budget_plan`
- `patch_itinerary_day`
- `patch_budget_category`
- `patch_memo_section`
- `validate_documents`
- `places_text_search`
- `places_details`
- `grounded_web_research`
- `compute_budget_summary`
- `finish_response`
- `request_clarification`

Planner decision-making is now intent-aware instead of keyword-scripted. Each turn resolves to a validated
`planner_agent_step.v1` with an explicit intent, document-edit flag, affected documents, optional duration
change, visible assistant text, and a bounded list of tool actions. Supported intents are:

- `initial_plan`
- `answer_question`
- `recommend_destinations`
- `change_duration`
- `change_budget`
- `add_destination`
- `change_preferences`
- `request_clarification`
- `unsupported`

Production-capable planner decisions use a backend-only Gemini structured-output provider. The provider receives a
sanitized state snapshot built from planner session facts, latest documents, recent messages, and research facts.
Local and automated tests keep a deterministic fallback provider that implements the same intent contract without
real Gemini calls.

The runtime enforces backend guardrails after the decision step:

- question-only and recommendation-only turns must respond in chat without document mutations unless the user asks to apply/update/use/add;
- duration changes update `plannerSessions.duration_days`, recompute `travel_end_date` from the existing start date, sync the trip-creation session, and rebuild itinerary/budget rows to the exact active day count;
- itinerary validation rejects non-sequential days, duration mismatches, and placeholder "Added destination research" cards;
- zero-budget requests are clarification cases and preserve the last valid budget document;
- memo patches regenerate structured memo content instead of appending repeated raw "Latest adjustment" user text;
- generic or unknown model tool names such as `upsert_document`, `write_document`, or `save_document` are rejected by schema/executor validation instead of being treated as successful no-ops.

The frontend consumes planner snapshots plus replayable event rows. It renders user and assistant messages, run lifecycle rows, active spinners, document commit rows, validation rows, and final assistant summaries without exposing raw tool arguments, raw provider payloads, API keys, cookies, or raw Gemini responses.

## Consequences

- Planner documents are now persisted and versioned instead of being preview-only.
- `/plan/{id}` now uses a planner session ID, not a trip creation session ID.
- Flow 2 destination selection is constrained to exactly one destination before planner creation.
- Continue-to-review and Accept Plan are enabled only when all three structured documents validate.
- Accepted Trip Plans can be created from planner documents and can produce invite links.
- The deterministic local/test implementation exercises the same session, intent, document, run, event, and tool boundaries as the Gemini-backed planner loop.

## Recovery Boundary

If a process dies during a run, the next recovery pass should mark the active run as interrupted, preserve accepted visible messages and latest valid documents, and let the user continue with a new message. The system does not attempt to resume an in-flight provider stream or replay non-idempotent document writes automatically.
