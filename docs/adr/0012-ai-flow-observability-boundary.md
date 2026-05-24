# 0012 AI Flow Observability Boundary

| Field | Value |
| --- | --- |
| Status | Accepted |
| Date | 2026-05-24 |
| Decision scope | Backend observability for Flow 1 classification and Flow 2 recommendation orchestration, raw LLM text retention, provider event logging, and log privacy boundaries |

## Context

SnapTrip now has two AI-heavy backend flows:

1. Flow 1 prepares trip-creation images for classification, runs the mock or MobileNet classifier, aggregates all four category confidences, and lets the user confirm categories.
2. Flow 2 uses confirmed categories, seed destinations, Gemini, Google Places, cache records, and recommendation persistence.

These flows previously had enough tests to validate behavior but limited runtime observability. Debugging provider failures, schema validation failures, fallback behavior, and classifier confidence propagation required reconstructing state from several collections and logs.

The product requirement is to make Flow 1 and Flow 2 observable by default, including rendered LLM prompt text and raw Gemini response text. At the same time, container logs must not leak raw LLM output unless explicitly enabled, and raw image bytes, tensors, secrets, cookies, provider keys, and passwords must never be logged or persisted as observability payloads.

## Decision Drivers

- **Debuggability**: provider input/output, fallback path, cache behavior, classifier preparation, and parsed AI results must be traceable per run.
- **Privacy and security**: raw image bytes, tensors, auth material, API keys, and raw provider internals must remain out of logs and frontend responses.
- **Operational default**: observability is useful during MVP rollout and must be enabled without extra deploy steps.
- **Retention control**: detailed AI traces are useful temporarily and should expire automatically.
- **Structured analysis**: events should be queryable by trace, session, owner, flow, stage, event, and status.
- **Log hygiene**: raw LLM text may be stored in the observability collection by default, but container logs should contain metadata only unless explicitly opted in.

## Considered Options

### Option 1: Container Logs Only

- **Pros**: simple implementation and easy access in deploy logs.
- **Cons**: raw LLM text would either be unavailable or leaked into long-lived logs; large prompts/responses would make logs noisy and harder to redact.

Rejected.

### Option 2: External Observability Vendor

- **Pros**: richer dashboards and retention controls.
- **Cons**: adds new infrastructure, credentials, cost, and data-sharing decisions before the MVP deploy boundary is stable.

Rejected for this iteration.

### Option 3: Backend Collection With Safe Structured Logs

- **Pros**: keeps detailed traces in MongoDB with TTL, keeps container logs metadata-only by default, supports tests in memory mode, and avoids adding a new external service.
- **Cons**: requires explicit sanitization discipline and does not provide dashboards by itself.

Accepted.

## Decision

Add a backend observability layer centered on a new `aiObservabilityEvents` collection.

Default configuration:

- `AI_OBSERVABILITY_ENABLED=true`
- `AI_RAW_LLM_OBSERVABILITY=true`
- `AI_RAW_LLM_LOGS=false`
- `AI_OBSERVABILITY_TTL_SECONDS=604800`
- `AI_OBSERVABILITY_MAX_FIELD_BYTES=262144`

Every event includes:

- `trace_id`
- `flow`
- `stage`
- `event`
- `status`
- `duration_ms` when available
- `session_id` when available
- `owner_id` when available
- `request_id` when available
- `created_at`
- `expires_at`

MongoDB creates a TTL index on `expires_at` with `expireAfterSeconds=0`. Memory mode supports the same collection shape for tests.

Structured backend logs are emitted for observability metadata. Raw LLM prompt/response text is removed from container logs unless `AI_RAW_LLM_LOGS=true`.

Raw LLM observability means rendered prompt text and raw Gemini response text before parsing. It does not include image bytes, binary multimodal payloads, tensors, secrets, cookies, API keys, passwords, or raw Google Places provider responses.

Oversized payload fields are truncated to the configured byte limit and annotated with truncation metadata, original byte count, and hashes.

## Instrumentation Scope

Flow 1 records:

- session creation;
- uploaded/source image additions with IDs, MIME types, sizes, checksums, and source metadata only;
- classification start;
- classifier input preparation with valid/missing image IDs and byte lengths only;
- classifier completion with per-image predictions and aggregate confidences for all four canonical labels;
- classifier failure with safe error class/message;
- category confirmation with predicted and confirmed categories.

Flow 2 records:

- run start with confirmed categories, seed count, classifier aggregate/per-image summaries, and image count;
- Gemini 1 prompt preparation and completion;
- Places Text Search and Place Details grounding for seed and non-seed candidates;
- Gemini 2 prompt preparation and completion;
- fallback events per stage;
- run completion with recommendation item IDs and fallback summary.

Provider boundaries:

- Gemini receives trace context per call and records rendered prompt text plus raw response text before schema validation.
- Google Places records request metadata, lookup path, field mask, status, latency, selected place ID, and field coverage. It does not store API keys or raw provider responses.
- The classifier records mode, model version, preprocessing metadata, predictions, and safe failures. It does not store image bytes or tensors.

## Security and Privacy Rules

- Raw LLM text is stored only in `aiObservabilityEvents` when `AI_RAW_LLM_OBSERVABILITY=true`.
- Container logs omit raw LLM prompt/response text unless `AI_RAW_LLM_LOGS=true`.
- Pydantic validation errors are sanitized before logging or fallback events. Safe validation payloads include error class, safe message, error count, field path, and error type/message without `input_value` or raw model output.
- Recommendation fallback events use stage-specific safe messages and raw output hashes/byte counts, not exception strings that may contain Gemini output snippets.
- Source-image observability counts only newly appended session image refs, not duplicate or previously attached refs.
- Frontend APIs do not expose observability events, raw prompts, raw responses, raw Places responses, provider secrets, or provider request headers.

## Consequences

Positive:

- Flow 1 and Flow 2 runs can be reconstructed by trace ID.
- Raw prompt/response text is available for backend debugging by default without leaking to container logs.
- Places fallback, cache behavior, Gemini validation, and classifier confidence propagation are testable and inspectable.
- TTL keeps detailed traces temporary by default.

Negative:

- MongoDB writes increase for AI-heavy requests.
- Raw LLM text in the database must be treated as sensitive operational data.
- Without a debug endpoint or dashboard, inspection still requires database/log access.

Operational implications:

- Production deploy examples and preflight scripts must include the AI observability environment variables.
- Operators should restrict database access and treat `aiObservabilityEvents` as sensitive.
- If raw LLM text must appear in container logs for emergency debugging, `AI_RAW_LLM_LOGS=true` is an explicit operational override.

## Implementation Notes

- Observability is implemented in `app/backend/app/core/observability.py`.
- `recommendationRuns` store trace metadata and observability flags for the latest run.
- `tripCreationSessions` may store the latest Flow 1 trace ID.
- Existing route and provider boundaries stay intact; instrumentation is passed through service/provider context instead of moving provider logic into routes.
- Sanitization helpers must be used for validation exceptions before constructing loggable event payloads.

## Related Decisions

- `0002-runtime-foundation-and-storage-boundaries.md`: establishes store and runtime boundaries.
- `0003-recommendation-provider-and-structured-output-boundary.md`: establishes Flow 2 provider orchestration and structured output validation.
- `0005-trip-creation-media-and-recommendation-handoff-boundary.md`: establishes trip creation media and selected recommendation handoff.
- `0011-real-image-classification-runtime-boundary.md`: establishes real classifier runtime and confidence output behavior.

## Verification

Implemented verification includes:

- backend tests for default observability configuration;
- Flow 1 tests for classification events, failure events without raw bytes, category confirmation telemetry, and accurate source-image added counts;
- Gemini tests for prompt/response retention by default, raw-text omission when disabled, sanitized validation failure events, and fallback events that avoid raw output leakage;
- Places provider tests for Text Search and Details event metadata;
- truncation tests for large observability payloads;
- Mongo integration test coverage for the TTL index when Docker-backed Mongo tests are available;
- root `npm run lint`;
- root `npm run typecheck`;
- root `npm test`;
- root `npm run build`;
- root `npm run docker:config`.
