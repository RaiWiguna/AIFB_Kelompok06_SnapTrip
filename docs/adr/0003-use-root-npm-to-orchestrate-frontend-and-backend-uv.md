# 0003 Use Root npm to Orchestrate Frontend npm and Backend uv

| Field | Value |
| --- | --- |
| Status | Accepted |
| Date | 2026-05-08 |
| Decision scope | Developer workflow and root scripts |

## Context

SnapTrip has a Node/Next.js frontend and a Python/FastAPI backend managed by `uv`. The user wants root-level convenience so common workflows can be run from the repository root with npm, while still using `uv` for backend dependency and command execution.

## Decision

The root `package.json` is the standard developer entrypoint. Root npm scripts must orchestrate:

- frontend commands through npm with `--prefix app/frontend`,
- backend commands through `cd app/backend && uv ...`.

Required root workflows include install, dev, test, typecheck, lint, build, and Docker Compose config validation.

## Rationale

This keeps onboarding and CI commands simple while preserving the correct package managers for each runtime. It also gives GitHub Actions a single command surface for routine validation.

## Consequences

- Root `npm install` must prepare root tooling, frontend dependencies, and backend `uv` environment.
- Backend tests must run through `uv run pytest`.
- Backend dev server must run through `uv run uvicorn`.
- Backend lint/typecheck/build-validation must run through `uv`.
- Frontend commands must run under `app/frontend`.
- CI should call root npm scripts instead of duplicating per-runtime command knowledge.

## Follow-up

- Add root `package.json` with the script contract from `.agents/PRD.md`.
- Add `concurrently` as a root dev dependency for combined dev server startup.
- Add backend `pyproject.toml` and `uv.lock`.
- Add frontend `package.json` when scaffolding the Next.js app.
