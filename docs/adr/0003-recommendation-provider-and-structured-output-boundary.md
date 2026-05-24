# 0003 Recommendation Provider and Structured Output Boundary

| Field | Value |
| --- | --- |
| Status | Accepted |
| Date | 2026-05-08 |
| Decision scope | Google Places enrichment, Gemini recommendation generation, structured output validation, provider fallback, recommendation persistence, and Flow 2 to Flow 3 handoff |

## Context

SnapTrip's MVP has three AI-adjacent flows:

1. Flow 1 classifies user-provided or saved/liked images into the four canonical tourism categories.
2. Flow 2 maps those categories to curated Indonesian destinations, enriches each destination through Google Places, and produces structured recommendation cards for the UI.
3. Flow 3 later turns selected recommendations into an agentic AI Trip Planner session.

This ADR covers Flow 2 only. The product contract requires:

- provider access through the FastAPI backend only;
- no direct frontend access to Gemini, Google Places, MongoDB, GridFS, or classifier runtime;
- LLM output validated into structured JSON before persistence or rendering;
- no raw chat text as canonical trip or recommendation content;
- deterministic fallback when external providers are disabled or fail.

The implementation must also preserve the sequence established in the PRD: classifier categories -> curated seed list -> Places enrichment -> Gemini structured cards -> user selects recommendations -> later planner handoff.

## Decision Drivers

- **Grounding**: Gemini must operate on backend-provided seed and Places context, not open-ended travel knowledge.
- **Provider secrecy**: API keys, raw Places photo resource names, raw prompts, and provider internals must stay backend-only.
- **UI readiness**: Flow 2 output must be card-ready structured data, not markdown or conversational text.
- **Reliability**: Browse/classification/recommendation fallback must work when Gemini or Places is unavailable.
- **Testability**: Automated tests must not require real Google provider credentials.
- **Future handoff**: Flow 3 should consume selected recommendation item IDs instead of reconstructing recommendations.
- **Maintainability**: Provider SDK/client code must stay outside FastAPI route handlers.

## Considered Options

### Option 1: Direct Gemini Prompt From Frontend

- **Pros**: Fastest demo path; fewer backend endpoints.
- **Cons**: Exposes provider access patterns, bypasses backend validation, makes persistence and retries unreliable, violates the PRD's backend-only provider rule.

Rejected.

### Option 2: Backend Gemini Only, Without Places Grounding

- **Pros**: Simple provider integration and lower latency.
- **Cons**: Higher hallucination risk for opening hours, costs, address, photos, and current place status. It also ignores the PRD requirement to enrich curated seeds through Google Places first.

Rejected.

### Option 3: Backend Places First, Gemini As Structured Recommendation Writer

- **Pros**: Keeps factual fields grounded in curated seeds and Places, isolates provider clients, supports deterministic fallback, and gives frontend stable structured cards.
- **Cons**: More backend code, more persistence records, and additional provider/cache test cases.

Accepted.

### Option 4: Deterministic Cards Only, No Gemini

- **Pros**: Most reliable and cheapest.
- **Cons**: Less polished destination copy and weaker match reasoning. It does not satisfy the MVP requirement to use Gemini for structured destination recommendation output.

Rejected as the primary path, accepted as fallback.

## Decision

SnapTrip Flow 2 uses backend-mediated provider orchestration:

1. Confirmed categories are loaded from an owned `tripCreationSessions` record.
2. Matching curated records are loaded from `destinationSeeds`; every canonical category has exactly 10 seeds with verified Google Places place IDs.
3. Gemini 1 receives seed data, classifier confidence context for all four labels, per-image confidence summaries, and available trip-creation images.
4. Gemini 1 returns exactly two seed picks and two non-seed "you may also like" picks, each with a preserved match reason.
5. The backend resolves non-seed picks through Places Text Search, then queries Place Details by place ID for all four picks. Seed lookups use place ID first and Text Search only as fallback.
6. Normalized enrichment data is cached in `placeEnrichments`.
7. Gemini 2 receives normalized Places details and preserved match reasons, then returns structured card copy, review summary, normalized address, and normalized opening-hours text.
8. The backend validates both Gemini outputs with Pydantic and semantic ID-reference checks.
9. The backend persists `recommendationRuns` and `recommendationItems`.
10. The user can persist selected recommendation item IDs on the trip creation session for later planner handoff.

Provider boundaries:

- Google Places lives behind `GooglePlacesProvider`.
- Gemini lives behind `GeminiRecommendationProvider`.
- The orchestration lives in `RecommendationService`.
- FastAPI routes are thin wrappers over the service.

## Prompt and Structured Output Policy

Flow 2 now has three relevant schema versions:

- `destination_seed_selection.v1` for Gemini 1 seed/non-seed selection.
- `destination_card_finalization.v1` for Gemini 2 normalized card copy.
- `destination_recommendation.v2` for persisted recommendation runs/items.

System instruction requires Gemini to:

- return only JSON matching the provided schema;
- use Bahasa Indonesia for user-facing copy;
- use only supplied curated seed data and Google Places enrichment;
- avoid inventing opening hours, prices, ratings, addresses, coordinates, photos, or provider facts;
- mark missing fields as unavailable and add warnings;
- preserve every provided `seed_id`, `place_enrichment_id`, category ID, and `photo_id`;
- label all costs as estimates.

The context payloads are JSON rather than prose. They include:

- `confirmed_categories`;
- `classifier_summary`;
- `candidate_destinations`;
- `place_enrichments`;
- `ui_requirements`.

Gemini configuration uses:

- `response_mime_type="application/json"`;
- response JSON schemas for the active Flow 2 step;
- step-specific system instructions for selection or finalization;
- conservative safety settings;
- no Google Search, URL context, code execution, or function-calling tools for Flow 2.

Invalid Gemini output falls back deterministically for the failed stage. Places failures fall back per candidate instead of failing the whole run.

## Persistence and API Boundary

New or extended persistence areas:

- `placeEnrichments`: normalized Google Places or curated fallback data, cache expiry, photo descriptors, warnings.
- `recommendationRuns`: run metadata, confirmed categories, candidate seed IDs, provider modes, fallback flags, safe error summary.
- `recommendationItems`: structured UI cards and stable item IDs.
- `tripCreationSessions`: latest recommendation run ID and selected recommendation item IDs.

New backend API behavior:

- `POST /api/trip-creation-sessions/{session_id}/recommendations` generates and persists a run.
- `GET /api/trip-creation-sessions/{session_id}/recommendations` lists owned session runs.
- `GET /api/recommendation-runs/{run_id}` returns one owned run and its items.
- `POST /api/trip-creation-sessions/{session_id}/selected-recommendations` stores selected item IDs.
- `GET /api/place-photos/{photo_id}` returns safe backend-controlled photo metadata.

The frontend must consume persisted runs/items and must not call providers or reconstruct prompts.

## Security and Privacy

- Gemini and Google Places keys remain backend-only.
- Raw prompts and raw provider output are not returned to the frontend.
- Raw Places photo resource names are kept in backend records and represented to the UI with backend-safe photo IDs.
- Provider errors are summarized safely and must not include keys, cookies, headers, or raw provider request bodies.
- Recommendation generation requires an authenticated owner of the trip creation session.
- Selected recommendation IDs are checked against owner and session before persistence.

## Consequences

Positive:

- Recommendation UI can be built against stable structured cards.
- Gemini is constrained to a grounded transformation task instead of open-ended travel generation.
- Flow 2 remains usable without provider credentials through deterministic fallback.
- Tests can mock providers and validate backend behavior without real Google calls.
- Flow 3 can receive selected recommendation IDs as a clean handoff.

Negative:

- Backend complexity increases through provider boundaries, cache records, schemas, and validation rules.
- Places/Gemini behavior still needs transport-level tests for more failure modes.
- Cached Places data can become stale and needs expiry handling and future refresh policy.
- Deterministic fallback cards are less polished than successful Gemini cards.

Operational implications:

- `google-genai` is now a backend dependency.
- Runtime can use Gemini Developer API keys by default.
- Optional Google Cloud Agent Platform mode is supported through environment variables but still needs deployment validation.
- Local and automated tests keep provider calls disabled or mocked by default.

## Implementation Notes

- Use the official Google Gen AI SDK (`google-genai`) and initialize with `genai.Client()` so credentials come from environment.
- Do not use legacy Gemini SDKs such as `google-generativeai`, `google-cloud-aiplatform`, or route-level direct REST calls for Gemini.
- Places API requests should use explicit field masks rather than wildcard masks.
- Pydantic validation is required even when SDK structured output is enabled because schema-constrained output does not guarantee semantic correctness.
- Semantic validation must reject mutated seed IDs, enrichment IDs, category IDs, or photo IDs.
- Mongo image storage now uses Motor GridFS bucket APIs rather than the previous placeholder collection.

## Related Decisions

- `0001-snaptrip-mvp-architecture-baseline.md`: establishes the MVP runtime, provider, and deployment direction.
- `0002-runtime-foundation-and-storage-boundaries.md`: establishes root scripts, FastAPI/store boundaries, MongoDB target storage, mock classifier mode, and the need to replace image placeholder storage with GridFS.

## Verification

Implemented verification includes:

- backend tests for deterministic fallback, grounded Gemini context, repair behavior, selected recommendation persistence, and Places normalization;
- optional MongoDB testcontainers coverage for GridFS upload/read and recommendation persistence, skipped when Docker is unavailable;
- root `npm run test`;
- root `npm run lint`;
- root `npm run typecheck`;
- root `npm run build`;
- root `npm run docker:config`.

## Follow-up

- Run MongoDB testcontainers with Docker available and expand coverage for place cache expiry/index assertions.
- Add provider transport-level tests for Google Places timeout, no-result, partial-result, and closure cases.
- Add provider-level tests for blocked Gemini responses and semantically invalid IDs.
- Review and freeze the pre-planner API response contract before frontend Phase 7-8 work.
- Add deployment environment examples for optional Agent Platform settings if hosted deployment uses Google Cloud credentials rather than a Gemini Developer API key.
