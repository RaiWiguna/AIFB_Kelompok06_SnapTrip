# 0007 Planner Preview and Deferred Acceptance Boundary

| Field | Value |
| --- | --- |
| Status | Accepted |
| Date | 2026-05-23 |
| Decision scope | Planner preview API, deterministic non-persisted preview documents, demo-only planner chat, disabled acceptance, and E2E server ownership |

## Context

The frontend includes planner workspace pages for memo, itinerary, budget, review, accepted states, and assistant interaction. The full product contract requires real agentic planner documents, Trip Plan acceptance, invites, and participants later. The current integration needed to make planner pages read real backend-selected destinations without pretending those later writes exist.

The architectural risk was a fake acceptance path: allowing preview pages to navigate into accepted trips, invites, or participant states would make the integrated product appear more complete than the backend contract.

## Decision Drivers

- **Boundary clarity**: preview data must not create official planner documents or accepted Trip Plans.
- **Owner-only access**: planner previews are tied to trip creation sessions and selected recommendations.
- **Determinism**: local/test preview generation must not depend on Gemini, Google Places, or real planner agents.
- **UI preservation**: the existing planner workspace visual shell should remain intact.
- **Test reliability**: integrated E2E must own its backend/frontend servers and avoid stale local dev servers.

## Considered Options

### Option 1: Keep Planner Pages Fully Mocked

- **Pros**: least backend work.
- **Cons**: production planner routes would remain disconnected from selected recommendations and could not validate the integration handoff.

Rejected.

### Option 2: Persist Official Planner Documents During Preview

- **Pros**: preview pages could resemble future planner output.
- **Cons**: violates sequencing by creating `trip_memo.v1`, `full_itinerary.v1`, or `budget_plan.v1` before the agentic planner implementation.

Rejected.

### Option 3: Build Deterministic Backend Preview Data Without Persistence

- **Pros**: connects planner UI to selected recommendations while keeping document persistence and acceptance deferred.
- **Cons**: requires explicit UX and API boundaries for disabled acceptance and demo-only chat.

Accepted.

## Decision

Planner preview reads through an authenticated backend endpoint.

API boundary:

- `GET /api/planner-preview/{trip_creation_session_id}` returns `404` for missing or non-owned sessions.
- The endpoint requires saved selected recommendation IDs and returns `422` when none exist.
- Preview data is deterministic and built from selected recommendation items, confirmed categories, and safe defaults.
- The response includes memo, itinerary, budget, destination, gallery, title, status, document metadata, and acceptance metadata shaped for the current planner UI.
- The endpoint does not create `trip_memo.v1`, `full_itinerary.v1`, `budget_plan.v1`, accepted Trip Plans, invites, or participants.

Frontend boundary:

- `/plan/[id]`, `/plan/[id]/memo`, `/plan/[id]/itinerary`, and `/plan/[id]/budget` initialize from backend preview data.
- `PlannerWorkspace` keeps its existing visual shell and accepts preview state through typed props.
- Scripted assistant behavior is isolated as `planner-demo` and remains demo-only until the real planner implementation.
- `/plan`, `/new/review`, and `/plan/[id]/accepted` preserve their page shells but communicate the deferred boundary rather than enabling fake acceptance.
- `/trips` uses backend account summary data instead of runtime trip fixtures.

Acceptance and invite boundary:

- Accept/review actions are non-operational for this integration boundary.
- Accepted routes, invite pages, real participant flows, and persisted planner document writes remain deferred.
- UI affordances that look like share/accept commands must be disabled or clearly bounded until real backend writes exist.

E2E server ownership:

- Playwright smoke tests start a memory-mode backend and frontend dev server.
- The E2E config refuses to reuse stale local servers so tests validate the current working tree.
- Local/test provider keys remain blank and disabled.

## Consequences

Positive:

- Planner pages now prove the selected-recommendation handoff works end to end.
- Preview document shapes can guide future planner UI without creating official persisted artifacts.
- The frontend keeps the implemented design while removing runtime dependency on generic mock planner data.
- Acceptance, invite, and participant boundaries are explicit and testable.

Negative:

- Users can inspect preview documents but cannot accept/share them yet.
- The planner workspace still contains scripted demo chat behavior until the real planner agent exists.
- E2E runs require ports `3000` and `8000` to be free because stale server reuse is disabled.

Operational implications:

- Local and CI E2E must run with memory storage and deterministic provider settings.
- Preview endpoint behavior depends on selected recommendation IDs being present on the trip creation session.
- Browser screenshots and smoke tests should seed data through real APIs before opening planner routes.

## Implementation Notes

- Return `404` rather than authorization detail for non-owned planner preview sessions.
- Return `422` when selected recommendations are missing so the frontend can send the user back to recommendation selection.
- Keep provider secret names out of frontend source and build inputs.
- Preserve planner page layout and styling while changing data sources through adapters.
- Do not add acceptance writes, invite writes, participant writes, or planner document persistence in preview code paths.

## Related Decisions

- `0003-recommendation-provider-and-structured-output-boundary.md`: establishes persisted selected recommendation items.
- `0004-frontend-display-integration-and-api-adapter-boundary.md`: establishes display adapters and fixture quarantine.
- `0005-trip-creation-media-and-recommendation-handoff-boundary.md`: establishes selected-destination handoff.
- `0006-trip-plan-detail-read-model-and-map-rendering-boundary.md`: distinguishes synthesized reads from official planner documents.

## Verification

Implemented verification included:

- backend tests for auth requirement, owner scoping, missing selected recommendations, preview generation, provider-secret exclusion, and non-persistence of official planner documents or accepted Trip Plans;
- frontend adapter and workspace render tests for planner preview shapes;
- a Playwright smoke test that signs up, creates a trip creation session, confirms categories, generates deterministic recommendations, selects destinations, and opens `/plan/{session_id}`;
- 1920x1080 screenshots for every modified planner/trips page under `tmp/screenshot-*.png`;
- root `npm run test`;
- root `npm run typecheck`;
- root `npm run lint`;
- root `npm run build`.

## Follow-up

- Expand integrated Playwright coverage beyond the planner smoke path.
- Implement real planner chat, persisted `trip_memo.v1`, `full_itinerary.v1`, and `budget_plan.v1` only after deployment foundation is in place.
- Add accepted Trip Plan, invite, and participant write flows as explicit backend APIs instead of re-enabling the preview-only fake path.
