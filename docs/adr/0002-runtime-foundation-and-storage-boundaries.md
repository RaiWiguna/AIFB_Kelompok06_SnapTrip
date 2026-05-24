# 0002 Runtime Foundation and Storage Boundaries

| Field | Value |
| --- | --- |
| Status | Accepted |
| Date | 2026-05-08 |
| Decision scope | Runtime scaffold, backend API foundation, storage boundary, local verification strategy, classifier boundary, and compose placeholders |

## Context

SnapTrip now has executable backend and frontend runtime foundations under the accepted `app/backend` and `app/frontend` layout. The implementation needs a durable record of what is already established in code, what is intentionally abstracted behind interfaces, and what still requires production-hardening before hosted deployment.

The canonical product contract remains `.agents/PRD.md`; this ADR records implementation-level architecture choices that future sessions should preserve or intentionally supersede.

## Decision

Root workflow:

- Root `package.json` is the single developer command surface.
- Backend commands are executed through `uv` from `app/backend`.
- Frontend commands are executed through npm from `app/frontend`.
- Root `npm run test` executes backend tests, frontend tests, and the Playwright command with no-test pass-through until real E2E specs exist.

Backend runtime:

- FastAPI is initialized through an app factory with lifespan-managed store setup.
- Request handling includes CORS, request IDs, and structured error envelopes.
- Health and readiness are exposed at both root/API forms required by the product contract.
- Domain routes are grouped under `/api` and keep persistence operations behind a store abstraction.

Storage boundary:

- MongoDB remains the runtime persistence target.
- The backend exposes a store interface with Mongo-backed runtime behavior and a memory-backed test adapter.
- The memory adapter exists only to keep current unit/API tests fast and deterministic while MongoDB testcontainers coverage is added later.
- Image metadata is stored in `uploadedImages`.
- The current Mongo image binary path is a placeholder and must be replaced with real MongoDB GridFS bucket APIs before production deployment.

Authentication and ownership:

- Email/password auth uses normalized email addresses, Argon2 password hashing, server-side sessions, hashed session tokens, and HTTP-only cookies.
- User-owned mutations route through authenticated FastAPI endpoints.
- Collection ownership, Trip Plan visibility, and private Trip Plan reads are enforced in backend routes/services.

Classifier boundary:

- The classifier is accessed through a backend service boundary.
- Local development and automated tests default to mock classifier mode.
- Real classifier mode was initially an incomplete configured boundary; it is now superseded by ADR 0011, which promotes the MobileNetV4 Medium v2 CPU inference artifact.
- Classifier and manual category confirmation outputs are constrained to the four canonical category IDs.

Compose and deployment placeholders:

- Root `docker-compose.yml` is local-development only and currently provides MongoDB.
- `deploy/compose/docker-compose.remote.yml` is a minimal valid MongoDB placeholder so root Docker config validation has both local and remote files.
- The remote compose placeholder must be replaced by the full Caddy, API, web, and Mongo topology before hosted deployment.

## Rationale

Keeping root npm as the command surface makes local development and future CI consistent while still using the correct package manager for each runtime.

The store abstraction lets backend API behavior be implemented now without spreading persistence details through route handlers. It also gives future work a clear target for swapping the current image placeholder to real GridFS and adding MongoDB testcontainers coverage.

Mock classifier mode prevents local development and tests from depending on a large trained artifact before the model promotion path exists. Keeping the real-mode boundary in code avoids coupling the API contract to the mock implementation.

The remote compose placeholder is intentionally narrow. It preserves the root Docker config contract now without pretending the production topology is complete.

## Consequences

- Future backend tests should add MongoDB testcontainers coverage and eventually remove reliance on the memory adapter for API-level behavior.
- The Mongo image placeholder is not production-final; real GridFS upload/read/delete helpers are required before image storage is considered complete.
- The real classifier path is available only under the promoted artifact and runtime boundary documented in ADR 0011.
- Hosted deployment work must replace the remote compose placeholder with the full production stack.
- API routes should continue to depend on service/store boundaries rather than directly embedding MongoDB or provider client logic.

## Follow-up

- Add MongoDB testcontainers tests for readiness, indexes, auth uniqueness, likes/collections uniqueness, and image storage behavior.
- Replace placeholder Mongo image byte storage with Motor/PyMongo GridFS bucket APIs.
- Add backend recommendation provider boundaries for Google Places and Gemini with mocked provider tests.
- Add real Playwright E2E specs once backend/frontend startup orchestration exists.
- Replace remote compose placeholder with the production Caddy/API/web/Mongo stack during deployment implementation.
