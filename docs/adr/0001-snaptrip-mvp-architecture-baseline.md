# 0001 SnapTrip MVP Architecture Baseline

| Field | Value |
| --- | --- |
| Status | Accepted |
| Date | 2026-05-08 |
| Decision scope | MVP repository layout, storage, developer workflow, deployment, and AI/provider boundaries |

## Context

SnapTrip is being rebuilt from a clean scaffold as an AI-native desktop web trip planner. The MVP needs a stable baseline for runtime layout, persistence, image storage, root developer commands, deployment, and AI provider boundaries before feature implementation begins.

Annulled earlier documents are no longer canonical. The active source of truth is `.agents/PRD.md`, supported by `.agents/implementationPhase.md` and `.agents/rules.md`.

## Decision

SnapTrip MVP adopts the following baseline decisions.

Runtime code layout:

```text
app/
  backend/
  frontend/
```

Persistence and image storage:

- Use self-hosted MongoDB as canonical persistence.
- Use MongoDB GridFS for uploaded image binaries.
- Use MongoDB testcontainers for backend integration tests.

Root developer workflow:

- Use root `package.json` as the standard developer entrypoint.
- Root npm scripts orchestrate frontend commands with `--prefix app/frontend`.
- Root npm scripts orchestrate backend commands through `cd app/backend && uv ...`.
- Standard root workflows include install, dev, test, typecheck, lint, build, and Docker config validation.

Deployment:

- Use single-VM Docker Compose deployment.
- Use Caddy for TLS and routing.
- Public domains are `snaptrip.site` and `api.snaptrip.site`.
- Root `docker-compose.yml` is local development only.
- Production compose lives at `deploy/compose/docker-compose.remote.yml`.
- Hosted releases use:

```text
/opt/snaptrip/hosted/releases/<sha>
/opt/snaptrip/hosted/current
/opt/snaptrip/hosted/current_release
/opt/snaptrip/hosted/shared
```

AI and provider boundaries:

- Google Places API, Gemini, MongoDB, GridFS, and classifier runtime are backend-only.
- Frontend must never call provider APIs or storage directly.
- LLM/agent outputs must be validated structured JSON before persistence or UI rendering.
- Agentic planner implementation is sequenced after Docker, remote compose, Caddy, and GitHub Actions deployment foundation.

## Rationale

Grouping runtime code under `app/` keeps backend and frontend ownership clear without spreading runtime directories across the repo root.

MongoDB fits SnapTrip's document-heavy domain model, especially structured AI outputs and Trip Plan documents. GridFS keeps image binaries in the same operational boundary for MVP and avoids adding object storage before it is necessary.

Root npm orchestration gives developers and CI one command surface while preserving the correct package manager for each runtime: npm for the frontend and `uv` for the backend.

Single-VM Docker Compose with Caddy is sufficient for MVP and keeps deployment understandable. The release-directory layout supports rollback without deleting MongoDB/GridFS shared data.

Backend-only provider access protects secrets, centralizes retries and fallback behavior, and makes AI output validation enforceable before UI rendering or persistence.

## Consequences

- Do not recreate top-level `backend/` or `frontend/` directories unless this ADR and `.agents/` source-of-truth files are revised.
- Dockerfiles, Compose files, GitHub Actions, and scripts must reference `app/backend` and `app/frontend`.
- Backend storage code must target MongoDB and GridFS, not PostgreSQL or local filesystem image storage.
- Backend tests must include MongoDB testcontainer coverage.
- CI should call root npm scripts instead of duplicating runtime-specific commands.
- Deployment and rollback must preserve `/opt/snaptrip/hosted/shared`, especially MongoDB/GridFS and Caddy data.
- Provider keys must exist only in backend runtime configuration.
- Recommendation cards, Trip Memo, Full Itinerary, and Budget Plan must be structured documents, not raw chat or markdown-only output.

## Follow-up

- Add root `package.json` with the script contract from `.agents/PRD.md`.
- Add `app/backend/pyproject.toml` and `app/backend/uv.lock`.
- Add Dockerfiles for `app/backend` and `app/frontend`.
- Add local and remote Compose files.
- Add Caddyfile and deploy scripts.
- Add GitHub Actions with path filters for `app/backend/**`, `app/frontend/**`, `tests/**`, `deploy/**`, Docker, dependency, and workflow changes.
- Add backend schemas and provider adapters that enforce structured AI output validation.
