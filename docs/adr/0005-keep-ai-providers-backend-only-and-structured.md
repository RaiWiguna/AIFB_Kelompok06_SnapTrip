# 0005 Keep AI Providers Backend-Only and Structured

| Field | Value |
| --- | --- |
| Status | Accepted |
| Date | 2026-05-08 |
| Decision scope | AI provider boundaries and output validation |

## Context

SnapTrip uses several AI/provider capabilities:

- PyTorch MobileNetV2 image classification,
- Google Places API enrichment,
- Gemini destination recommendation,
- Gemini agentic planner with backend tools.

The frontend must render polished product surfaces, not raw LLM chat or raw provider responses.

## Decision

All AI and external provider calls happen in the FastAPI backend. The frontend must never call Gemini, Google Places API, MongoDB, GridFS, or classifier runtime directly.

Every LLM or agent output must be validated into structured JSON before persistence or UI rendering.

Agentic planner implementation is sequenced after Docker, remote compose, Caddy, and GitHub Actions deployment foundation.

## Rationale

Backend-only provider access protects secrets, centralizes retries/fallbacks, and keeps provider contracts testable. Structured validation prevents raw or malformed model output from becoming canonical Trip Plan data.

Deferring the agentic planner until after deployment foundation reduces scope risk and lets the pre-planner product ship and deploy first.

## Consequences

- Provider API keys must exist only in backend runtime configuration.
- AI schemas must be versioned and validated.
- Recommendation cards, Trip Memo, Full Itinerary, and Budget Plan must be structured documents.
- Planner tools must be backend-mediated and must validate tool outputs before mutation.
- Planner must preserve last valid structured documents if Gemini/tool calls fail.
- UI must render structured panels/documents instead of raw markdown/chat transcripts.

## Follow-up

- Add Pydantic schemas for recommendation and trip documents.
- Add mocked provider tests.
- Add deterministic fallback for Places/Gemini recommendation failure.
- Add planner schemas and tools only after deployment foundation is in place.
