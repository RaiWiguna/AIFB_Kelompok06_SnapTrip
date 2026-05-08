# 0001 Use `app/` Directory for Runtime Code

| Field | Value |
| --- | --- |
| Status | Accepted |
| Date | 2026-05-08 |
| Decision scope | Repository layout and runtime ownership |

## Context

SnapTrip is being rebuilt from a clean scaffold. The project has two runtime surfaces: a Python FastAPI backend and a Next.js frontend. The user requested that frontend and backend live under a single `app/` directory instead of separate top-level `backend/` and `frontend/` directories.

The repository also has non-runtime directories for project memory, ADRs, training assets, deployment files, and E2E tests.

## Decision

Runtime code must live under:

```text
app/
  backend/
  frontend/
```

Top-level `backend/` and `frontend/` directories must not be recreated unless `.agents/PRD.md`, `.agents/implementationPhase.md`, and this ADR are intentionally revised.

## Rationale

This keeps runtime application code grouped in one place while still separating backend and frontend ownership. It also makes path filters easier to express:

- runtime backend: `app/backend/**`
- runtime frontend: `app/frontend/**`
- non-runtime project memory: `.agents/**`
- non-runtime ADR/docs: `docs/**`
- non-runtime ML training assets: `training/**`

## Consequences

- Root npm scripts must use `--prefix app/frontend` for frontend commands.
- Backend scripts must run from `app/backend`.
- Dockerfiles, Compose files, GitHub Actions, and test tooling must reference `app/backend` and `app/frontend`.
- Future agents should treat any top-level `backend/` or `frontend/` path as obsolete unless explicitly reintroduced by a source-of-truth update.

## Follow-up

- Create root `package.json` using the documented `app/backend` and `app/frontend` paths.
- Configure CI/CD path filters against `app/backend/**` and `app/frontend/**`.
