# SnapTrip Implementation Phase

| Field | Value |
| --- | --- |
| Document status | Canonical implementation roadmap |
| Created | 2026-05-08 |
| Last updated | 2026-05-23 |
| Source of truth | `.agents/PRD.md` |
| Purpose | Execution plan for implementing SnapTrip across scaffold, MongoDB/GridFS backend, PyTorch classifier, frontend, recommendation AI, deployment, post-deployment agentic planner, and final acceptance |

## 1. Roadmap Summary

Implementation order:

1. Product contract and repository baseline.
2. Workspace modernization and root script orchestration.
3. MongoDB, GridFS, auth, and core backend foundation.
4. Explore, likes, collections, and Trip Plan backend.
5. Image upload, classifier, categories, and destination seed backend.
6. Google Places and Gemini recommendation backend.
7. Backend tests and API contract hardening for the pre-planner product.
8. Frontend/backend integration against the current frontend experience.
9. Integrated product E2E validation.
10. Docker, deployment, GitHub Actions, and remote rollback.
11. Agentic planner, structured documents, acceptance, invites, participants, and planner UI.
12. Final hardening, acceptance pass, and handoff.

Current workspace baseline:

- Implementation should proceed from the restored `.agents/` contracts and the clean scaffold requested by the user.
- Future scaffold/reset work must preserve `.agents/` because it is the active project memory and source-of-truth layer.

## 2. Cross-cutting Engineering Rules

- Treat `.agents/PRD.md` as the product and technical contract.
- Keep backend domain logic out of FastAPI route handlers.
- Keep frontend business policy out of React components.
- All user-owned mutations must go through authenticated FastAPI routes.
- Frontend must never call MongoDB, GridFS, Gemini, Google Places API, or classifier runtime directly.
- Every LLM/agent output must be schema-validated before persistence or UI rendering.
- Do not implement the agentic planner until Docker, remote compose, Caddy, and GitHub Actions deployment are in place.
- `training/**`, `docs/**`, and `.agents/**` are non-runtime paths and must not trigger hosted-runtime CI/CD or production deploy when changed by themselves.
- `training/**` is offline ML model training only and must stay separated from backend runtime code.
- `docs/adr/**` is for Architecture Decision Records according to `.agents/rules.md`.
- Hosted deploy and rollback must never delete MongoDB/GridFS persistent data.
- CI/CD must exclude Trivy and CodeQL.

## 3. Target Repository Layout

```text
.agents/
  PRD.md
  implementationPhase.md
  integrationPhases.md
  rules.md
  sessionHandoff.md
app/
  backend/
    app/
      api/
      core/
      db/
      schemas/
      services/
      providers/
      ai/
    tests/
  frontend/
    app/
    components/
    lib/
    tests/
docs/
  adr/
tests/
  e2e/
training/
  data/
  notebook/
  output/
deploy/
  caddy/
  compose/
  env/
  scripts/
.github/
  workflows/
docker-compose.yml
package.json
app/backend/pyproject.toml
app/backend/uv.lock
```

Ownership:

- `app/backend/app/api`: FastAPI routers.
- `app/backend/app/core`: config, security, errors, time, IDs, logging.
- `app/backend/app/db`: MongoDB, GridFS, indexes, repositories.
- `app/backend/app/schemas`: Pydantic request/response and AI schemas.
- `app/backend/app/services`: domain orchestration.
- `app/backend/app/providers`: Google Places, Gemini, web research.
- `app/backend/app/ai`: classifier loading, preprocessing, inference, aggregation, mock classifier.
- `docs/adr`: durable ADRs.
- `training/data`: offline dataset material.
- `training/notebook`: training notebooks.
- `training/output`: offline model outputs before explicit promotion.

Do not import from `training/**` in backend or frontend runtime code.

## 4. Phase 0 - Product Contract and Architecture Baseline

Status: Restored.

Execution list:

- Keep `.agents/PRD.md` as canonical.
- Keep four categories: `pantai`, `gunung`, `air_terjun`, `wisata_tradisional`.
- Keep email/password auth.
- Keep MongoDB/GridFS.
- Keep PyTorch MobileNetV2.
- Keep Google Places API and Gemini backend-only.
- Keep domains `snaptrip.site` and `api.snaptrip.site`.
- Store ADRs under `docs/adr/`.

Exit criteria:

- PRD and roadmap agree on stack, domains, AI flow, deployment topology, and non-goals.

## 5. Phase 1 - Workspace Modernization and Root Scripts

Status: Complete in foundation implementation on `feat/snaptrip-foundation`.

Execution list:

- Add root `package.json`.
- Add root scripts:
  - `install`
  - `dev`
  - `test`
  - `test:backend`
  - `test:frontend`
  - `test:e2e`
  - `typecheck`
  - `lint`
  - `build`
  - `docker:config`
- Add uv-managed backend dependency files under `app/backend/`.
- Add Vitest frontend test baseline.
- Add root local `docker-compose.yml` with MongoDB.
- Keep `training/data`, `training/notebook`, `training/output`, and `docs/adr` present.

Exit criteria:

- Root commands are the primary developer entrypoint.
- Local MongoDB can start from repo root.
- Non-runtime scaffold directories exist.
- `.agents/` remains intact.

## 6. Phase 2 - MongoDB, GridFS, Auth, and Core Backend

Status: Complete in foundation implementation on `feat/snaptrip-foundation`.

Execution list:

- Scaffold FastAPI app factory.
- Add settings for app URLs, CORS, session secret, MongoDB, GridFS, classifier, Gemini, Places.
- Add request ID, structured error envelope, and safe logging.
- Add MongoDB client lifecycle.
- Add GridFS client.
- Initialize indexes.
- Implement `/health`, `/api/health`, and `/ready`.
- Implement signup, login, logout, and current profile.

Exit criteria:

- API starts locally.
- `/ready` succeeds only when MongoDB/GridFS are ready.
- Authenticated requests can identify current user.

## 7. Phase 3 - Explore, Likes, Collections, and Trip Plan Backend

Status: Complete in foundation implementation on `feat/snaptrip-foundation`.

Execution list:

- Implement TripPlan repository/service.
- Implement public/private visibility checks.
- Implement Explore feed with category filters.
- Implement like/unlike.
- Implement collections and collection items.
- Expose safe image references for later trip creation.

Exit criteria:

- Authenticated users can like and save public Trip Plans.
- Explore returns only public accepted Trip Plans.

## 8. Phase 4 - Image Upload, Classifier, Categories, and Seeds

Status: Complete in foundation implementation on `feat/snaptrip-foundation`.

Execution list:

- Implement trip creation session.
- Implement image upload to GridFS.
- Implement image references from liked/saved Trip Plans.
- Add PyTorch MobileNetV2 classifier module and mock classifier mode.
- Implement classification endpoint and aggregation.
- Implement category confirmation/manual correction.
- Seed curated Indonesian destinations across all four categories.

Exit criteria:

- Flow 1 works through backend.
- Confirmed categories are available for recommendation.

## 9. Phase 5 - Google Places and Gemini Recommendation Backend

Status: Complete in backend implementation.

Execution list:

- Implement Google Places provider with httpx.
- Normalize Places data.
- Cache/persist PlaceEnrichment.
- Select destination candidates by confirmed categories.
- Implement Gemini recommendation adapter.
- Validate structured recommendation output.
- Retry once on invalid JSON.
- Fallback deterministically when provider output fails.
- Implement recommendation and place endpoints.

Exit criteria:

- Flow 2 backend returns structured destination cards.

## 10. Phase 6 - Backend Tests and Pre-planner Contract Freeze

Status: In progress.

Execution list:

- Add backend unit tests for auth, categories, classifier aggregation, recommendation fallback, likes, and collections.
- Add testcontainers MongoDB integration tests.
- Test GridFS upload/retrieve.
- Test Places/Gemini providers with mocked clients.
- Freeze pre-planner API contracts for frontend.

Current implementation notes:

- Recommendation fallback, Gemini repair, grounded context construction, Places normalization, selected recommendation persistence, and root backend tests are implemented.
- Mongo image storage now uses a real Motor GridFS bucket path instead of the previous placeholder collection.
- Initial MongoDB testcontainers coverage is present for recommendation persistence and GridFS upload/retrieve, but it skips when Docker is unavailable; additional provider transport cases should still be added before the pre-planner backend contract is considered fully frozen.

Exit criteria:

- Backend pre-planner behavior is tested and stable.

## 11. Phase 7 - Frontend/Backend Integration

Status: In progress.

Execution list:

- Treat the current `app/frontend/` experience as the visual and interaction target.
- Create and follow `.agents/integrationPhases.md`.
- Add frontend API client, env validation, runtime state, and typed display adapters.
- Prefer backend/API improvements over UI redesign when current frontend mock shapes and backend responses differ.
- Integrate auth/account, Explore, likes, collections, trip creation, image classification, recommendations, destination selection, Trip Plan detail reads, and Google Maps rendering.
- Keep Google Places API backend-only; use Google Maps JavaScript API in the frontend only for map rendering with a browser-restricted public key.
- Keep agentic planner, persisted structured planner documents, acceptance, invites, and participants owned by Phase 11.

Exit criteria:

- Integrated frontend product surfaces use backend API/adapters instead of runtime mock data, except explicit Phase 11 planner/demo boundaries.
- Current frontend visual behavior is preserved with only minor adapter/state changes.
- `.agents/integrationPhases.md` remains the detailed execution source for Phase 7.

Current implementation notes:

- Phase 7.0-7.3 are implemented in repo terms:
  - DTO/source mapping is recorded in `.agents/integrationPhases.md`.
  - Frontend API client, env helper, display types, and adapters exist under `app/frontend/lib/api/`.
  - Auth pages submit to backend auth APIs with cookie-backed sessions.
  - Account summary, Explore, liked trips, collections, collection detail, and new-trip source preview pages are backend-backed.
  - Backend display endpoints now include `GET /api/account/summary`, `GET /api/likes/trip-plans`, and `GET /api/collections/{slug_or_id}`.
- New trip image-to-recommendation integration is implemented in repo terms:
  - `GET /api/trip-creation-sessions/{session_id}` returns reload-safe session display state with images, latest classification, latest recommendations, and selected recommendation IDs.
  - `/new/upload`, `/new/review-images`, `/new/categories`, and `/new/recommendations` use backend trip creation, classification, category confirmation, recommendation, and selection APIs.
  - Liked-trip and collection source flows only send backend-owned image IDs to classification; static fallback covers remain display-only.
- Trip detail map and read integration is implemented in repo terms:
  - `GET /api/trip-plans/{trip_plan_id}/detail` returns read-optimized hero, destination, memo, itinerary, budget, gallery, owner, engagement, and owner-only participant placeholder data.
  - Public accepted trip details are anonymous-readable; private and invite-only trip details remain owner-only until participant access is implemented later.
  - `/trips/[id]`, `/trips/[id]/memo`, `/trips/[id]/itinerary`, `/trips/[id]/destinations`, and `/trips/[id]/budget` now read backend detail data through frontend adapters.
  - `TripRouteMap` renders Google Maps JavaScript API markers when a browser-restricted `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY` and backend coordinates exist, and otherwise keeps the static route map fallback for local/test runs.
- Planner preview boundary and integration cleanup are implemented in repo terms:
  - `GET /api/planner-preview/{trip_creation_session_id}` returns owner-only deterministic preview data from selected recommendations without persisting official planner documents or accepted Trip Plans.
  - `/plan/[id]`, `/plan/[id]/memo`, `/plan/[id]/itinerary`, and `/plan/[id]/budget` now use backend planner preview data through frontend adapters.
  - Scripted planner chat remains demo-only and isolated from backend planner state until Phase 11.
  - Fake acceptance behavior is quarantined; `/new/review` and `/plan/[id]/accepted` now communicate the deferred boundary instead of pretending acceptance exists.
  - `/trips` now reads backend account summary data.
  - Playwright smoke coverage now exercises signup, category confirmation, deterministic recommendations, selected destination persistence, and planner preview rendering.
- Broader integrated product E2E coverage and deployment remain pending.

## 12. Phase 8 - Merged into Phase 7

Status: Retired as standalone phase.

Execution list:

- Former frontend foundation and frontend product surface work now belongs to Phase 7.
- Use `.agents/integrationPhases.md` instead of this retired phase for frontend/backend integration details.

Exit criteria:

- Not applicable; Phase 7 owns the integrated frontend/backend exit criteria.

## 13. Phase 9 - Integrated Product E2E

Status: Complete in integrated product journey validation.

Execution list:

- Add Playwright harness.
- Seed test users, destination seeds, and public Trip Plans.
- Cover signup/login/logout.
- Cover Explore/filter/like/save/collection flows.
- Cover image upload/classification/category correction.
- Cover recommendation generation and destination selection.
- Cover public Trip Plan detail read.
- Cover Google Maps fallback path in CI and configurable Maps smoke path locally.
- Confirm planner routes load preview/demo state without asserting Phase 11 agent behavior.

Exit criteria:

- Integrated frontend/backend user journeys pass E2E without real Gemini, Google Places, or Google Maps keys in CI.

Current implementation notes:

- Playwright now runs integrated product journeys serially against memory-mode FastAPI and the local Next.js dev server.
- Test-only `POST /api/testing/reset-product-journeys` seeds deterministic public accepted Trip Plans across all four canonical categories and a private control Trip Plan; it is registered only when `APP_ENV=test`.
- Trip card display DTOs now expose viewer saved state, and the frontend card includes a compact save-to-collection control with inline collection creation.
- E2E coverage includes signup/login/logout, Explore category filters, like/save/create collection, image upload/classification/category confirmation, deterministic recommendations, destination selection, planner preview, public Trip Plan detail reads, and the no-key Google Maps static fallback path.
- CI/local E2E continues to require no real Gemini, Google Places, or Google Maps keys.

## 14. Phase 10 - Docker, Deployment, GitHub Actions, and Rollback

Status: Implemented.

Execution list:

- Added backend Dockerfile.
- Added frontend Dockerfile.
- Completed root `docker-compose.yml` for local Mongo/API/web.
- Replaced `deploy/compose/docker-compose.remote.yml` with the production Caddy/API/web/Mongo topology.
- Added `deploy/caddy/Caddyfile`.
- Added SnapTrip deploy scripts:
  - `bootstrap-vm.sh` to prepare `/opt/snaptrip/hosted`, shared directories, Docker, and Caddy prerequisites.
  - `remote-preflight.sh` to validate VM tools, release paths, runtime env, Docker Compose, and permissions before deploy.
  - `remote-deploy.sh` to start the remote compose stack from an immutable source-archive release, switch `current`, and write `current_release`.
  - `remote-rollback.sh` to switch back to the previous release and restart the remote compose stack.
  - `assert-ready.sh` to validate `https://api.snaptrip.site/ready`.
  - `smoke-check.sh` to validate `https://snaptrip.site`, `https://api.snaptrip.site/health`, and `https://api.snaptrip.site/ready`.
- Added root `bootstrapscripts.sh` alias for VM bootstrap.
- Added GitHub Actions CI.
- Added GitHub Actions deploy.
- Configured path filters so `.agents/**`, `docs/**`, `training/**`, `drafts/**`, `examples/**`, and root `*.md` only changes do not trigger hosted-runtime CI/CD or production deploy.
- Excluded Trivy and CodeQL.

Exit criteria:

- Integrated frontend/backend product is deployable to the VM through GitHub Actions or manual dispatch.
- Smoke checks and `/ready` are implemented in deploy validation.
- Rollback preserves MongoDB/GridFS data by keeping all persistent data under `/opt/snaptrip/hosted/shared`.

## 15. Phase 11 - Agentic Planner, Documents, Acceptance, Invites, Participants, and Planner UI

Status: Pending.

Execution list:

- Define structured document schemas:
  - `trip_memo.v1`
  - `full_itinerary.v1`
  - `budget_plan.v1`
- Implement planner session backend.
- Implement backend planner tools.
- Implement Gemini planner provider.
- Implement planner messages and document endpoints.
- Implement Trip Plan acceptance.
- Implement share invites and participants.
- Replace deferred planner UI with real planner UI.
- Implement invite frontend.
- Add planner E2E tests.
- Promote or replace Phase 7 planner preview adapters with real planner session/document contracts.

Exit criteria:

- Flow 3 works after deployment foundation.
- Accepted Trip Plans contain Trip Memo, Full Itinerary, and Budget Plan.
- Share invite and participant list work.

## 16. Phase 12 - Final Hardening and Handoff

Status: Pending.

Execution list:

- Harden backend auth, rate limits, provider timeouts, safe errors, and authorization.
- Harden frontend loading/error/empty/invalid states.
- Review Gemini prompts, schema validation, fallback behavior, and uncertainty labels.
- Run backend tests.
- Run frontend tests.
- Run Playwright E2E.
- Run lint, typecheck, build.
- Run Docker Compose config/build checks.
- Run remote smoke checks when environment exists.
- Update `.agents/implementationPhase.md` statuses.
- Add ADRs under `docs/adr/`.
- Revise root `README.md` after it is no longer annulled.

Exit criteria:

- Future agents can resume from `.agents/` without relying on annulled drafts.

## 17. Dependency Matrix

| Phase | Depends on | Unlocks |
| --- | --- | --- |
| Phase 0 | None | All later implementation |
| Phase 1 | Phase 0 | Root scripts, uv/npm workflow, local MongoDB |
| Phase 2 | Phase 1 | Auth, MongoDB/GridFS, readiness |
| Phase 3 | Phase 2 | Explore, likes, collections, TripPlan reads |
| Phase 4 | Phase 2 | Upload, classifier, category confirmation |
| Phase 5 | Phase 4 | Structured recommendations |
| Phase 6 | Phase 2-5 | Pre-planner contract freeze |
| Phase 7 | Phase 1, Phase 6 | Frontend/backend integration |
| Phase 8 | Phase 7 | Retired; merged into Phase 7 |
| Phase 9 | Phase 7 | Integrated product E2E validation |
| Phase 10 | Phase 1, Phase 2, Phase 9 | Hosted deployment |
| Phase 11 | Phase 10, Phase 5, Phase 7 | Agentic planner, documents, acceptance, invites |
| Phase 12 | Phase 10, Phase 11 | MVP acceptance and handoff |

## 18. Recommended First Execution Batch

1. Preserve restored `.agents/`.
2. Create full directory scaffold with `.gitkeep`.
3. Add `.env.local` files where needed.
4. Add root `package.json` and scripts.
5. Add uv-managed backend dependency files.
6. Add root MongoDB compose.
7. Add MongoDB client, GridFS client, and `/ready`.
8. Implement auth signup/login/logout/me.

## 19. Minimum MVP Demo Sequence

1. User signs up and logs in.
2. User browses Explore and filters by category.
3. User likes a public Trip Plan.
4. User saves a Trip Plan to a new collection.
5. User starts trip creation.
6. User uploads or chooses images from saved inspiration.
7. System classifies categories.
8. User confirms categories.
9. System returns structured recommendations.
10. User selects destinations.
11. Integrated frontend/backend product deploys through Docker Compose, Caddy, and GitHub Actions.
12. Deployed smoke checks and `/ready` pass.
13. User chats with AI Trip Planner after deployment milestone.
14. Planner produces Trip Memo, Full Itinerary, and Budget Plan.
15. User accepts final Trip Plan.
16. User generates share invite.
17. Another authenticated user joins and sees documents plus participants.
18. Owner publishes Trip Plan to Explore.

## 20. Definition of Done

- Root scripts install, test, typecheck, lint, and build implemented runtimes.
- Backend uses MongoDB/GridFS, not PostgreSQL.
- Auth, Explore, likes, collections, upload, classifier, recommendations, planner, documents, acceptance, invites, and participants work through API contracts.
- Frontend implements the full product flow.
- Playwright covers main journeys.
- Local and remote Compose validate.
- Caddy routes `snaptrip.site` and `api.snaptrip.site`.
- GitHub Actions deploys from `main` and excludes Trivy and CodeQL.
- Hosted-runtime CI/CD does not trigger for `.agents/**`, `docs/**`, or `training/**`-only changes.
- Remote rollback preserves MongoDB/GridFS data.

## 21. Detailed Phase Execution Lists

This section restores the detailed implementation guidance expected by future agents. The numbered roadmap above is the source of sequencing; the lists below make each phase executable without re-deciding architecture.

### 21.1 Phase 1 detailed execution

Workspace and scripts:

- Create root `package.json`.
- Add npm scripts that shell out to frontend npm and backend `uv` commands.
- Make root npm the standard entrypoint for both frontend and backend workflows.
- Ensure root scripts work from PowerShell and Linux CI.
- Add `app/backend/pyproject.toml` and `app/backend/uv.lock`.
- Convert backend dependencies away from old `requirements.txt` assumptions.
- Add `app/frontend/package.json` only when frontend package is scaffolded.
- Add Vitest config during frontend scaffold.
- Add Playwright config during E2E scaffold.

Required root `package.json` orchestration contract:

```json
{
  "private": true,
  "scripts": {
    "postinstall": "npm run install:all",
    "install:frontend": "npm install --prefix app/frontend",
    "install:backend": "cd app/backend && uv sync",
    "install:all": "npm run install:frontend && npm run install:backend",
    "dev:frontend": "npm run dev --prefix app/frontend",
    "dev:backend": "cd app/backend && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000",
    "dev": "concurrently \"npm run dev:frontend\" \"npm run dev:backend\"",
    "test:frontend": "npm test --prefix app/frontend",
    "test:backend": "cd app/backend && uv run pytest",
    "test:e2e": "npx playwright test --config tests/e2e/playwright.config.ts",
    "test": "npm run test:backend && npm run test:frontend && npm run test:e2e",
    "typecheck:frontend": "npm run typecheck --prefix app/frontend",
    "typecheck:backend": "cd app/backend && uv run python -m compileall app tests",
    "typecheck": "npm run typecheck:backend && npm run typecheck:frontend",
    "lint:frontend": "npm run lint --prefix app/frontend",
    "lint:backend": "cd app/backend && uv run ruff check .",
    "lint": "npm run lint:backend && npm run lint:frontend",
    "build:frontend": "npm run build --prefix app/frontend",
    "build:backend": "cd app/backend && uv run python -m compileall app",
    "build": "npm run build:backend && npm run build:frontend",
    "docker:config": "docker compose config && docker compose -f deploy/compose/docker-compose.remote.yml config"
  },
  "devDependencies": {
    "concurrently": "^9.0.0"
  }
}
```

Implementation may add extra scripts, but must preserve these root-level command names and the backend-through-`uv` behavior.

Directory scaffold:

- Keep `.agents/` intact.
- Create `app/backend/app/api`, `app/backend/app/core`, `app/backend/app/db`, `app/backend/app/schemas`, `app/backend/app/services`, `app/backend/app/providers`, `app/backend/app/ai`, and `app/backend/tests`.
- Create `app/frontend/app`, `app/frontend/components`, `app/frontend/lib`, and `app/frontend/tests`.
- Create `tests/e2e`.
- Create `deploy/caddy`, `deploy/compose`, `deploy/env`, and `deploy/scripts`.
- Create `.github/workflows`.
- Create `training/data`, `training/notebook`, `training/output`.
- Create `docs/adr`.
- Add `.gitkeep` where directories would otherwise be empty.

Environment files:

- Add root `.env.local` for shared local development values.
- Add `app/backend/.env.local` for backend-only local secrets and provider flags.
- Add `app/frontend/.env.local` for public frontend env such as `NEXT_PUBLIC_API_BASE_URL`.
- Do not commit real secrets.
- Use clearly fake local defaults.

### 21.2 Phase 2 detailed execution

FastAPI foundation:

- Implement `create_app`.
- Register CORS from settings.
- Register request ID middleware.
- Register global exception handler.
- Register API routers under `/api`.
- Register `/health`, `/api/health`, and `/ready`.

Settings:

- `APP_NAME`
- `APP_ENV`
- `API_BASE_URL`
- `WEB_BASE_URL`
- `CORS_ORIGINS`
- `SESSION_SECRET`
- `COOKIE_SECURE`
- `COOKIE_DOMAIN`
- `MONGODB_URI`
- `MONGODB_DATABASE`
- `GRIDFS_BUCKET`
- `CLASSIFIER_MODEL_PATH`
- `CLASSIFIER_MODEL_VERSION`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `GOOGLE_PLACES_API_KEY`
- `USE_GOOGLE_PLACES`
- `USE_GEMINI`

MongoDB:

- Add async or sync Mongo client consistently.
- Initialize indexes deterministically.
- Make `/ready` fail if MongoDB is unavailable.
- Add repository helper for consistent collection access.

GridFS:

- Add bucket helper.
- Add image upload helper.
- Add controlled image streaming helper.
- Add checksum generation.
- Add metadata validation.

Auth:

- Hash passwords with a modern algorithm.
- Normalize email.
- Create users.
- Create sessions.
- Store session hashes.
- Issue HTTP-only cookies.
- Revoke sessions on logout.
- Add current-user dependency.

### 21.3 Phase 3 detailed execution

TripPlan backend:

- Implement `tripPlans` collection access.
- Implement visibility checks for public/private/invite-only.
- Implement status checks for draft/accepted/archived.
- Add public fixture factory for tests.
- Add cover image and category metadata fields.

Explore:

- Implement cursor pagination.
- Filter by canonical category.
- Join or aggregate like/save counts.
- Include viewer state for authenticated users.
- Keep unauthenticated viewer state safe.

Likes:

- Enforce unique `user_id + trip_plan_id`.
- Return stable response after repeated like.
- Return stable response after repeated unlike.

Collections:

- Enforce owner-only collection access.
- Enforce unique `collection_id + trip_plan_id`.
- Support create during save flow.
- Support rename/delete.

### 21.4 Phase 4 detailed execution

Trip creation:

- Create `tripCreationSessions` collection or embed creation state in a dedicated collection.
- Store owner, status, image IDs, confirmed categories, selected recommendations, and timestamps.
- Enforce owner access.

Upload:

- Accept multipart images.
- Validate count, size, and mime.
- Store binary in GridFS.
- Store metadata in `uploadedImages`.
- Support source references from liked/saved Trip Plans.

Classifier:

- Add preprocessing pipeline.
- Add real-model compatible inference interface.
- Add mock classifier mode.
- Add model version metadata.
- Map logits/classes to canonical category IDs.
- Aggregate per-image results.

Categories:

- Implement `/api/categories`.
- Implement confirm endpoint.
- Reject unknown category IDs.

Seeds:

- Seed enough curated Indonesian destinations for every category.
- Include fallback description, cost, duration, region, search query, and optional Google place ID.

### 21.5 Phase 5 detailed execution

Places:

- Implement httpx client.
- Support lookup by place ID.
- Support text search fallback.
- Normalize provider response.
- Persist with expiry.
- Respect provider timeout.
- Continue run when a candidate fails.

Gemini recommendation:

- Build prompt from confirmed categories, constraints, seed data, and enrichment.
- Require JSON output.
- Validate with Pydantic.
- Retry once with repair prompt.
- Fallback deterministically.
- Persist run and items.

Recommendation API:

- Generate recommendation run from a trip creation session.
- Return structured cards.
- Fetch persisted runs.
- Fetch normalized place detail.

### 21.6 Phase 6 detailed execution

Tests:

- Unit tests for pure services.
- Integration tests with testcontainers MongoDB.
- Provider tests with mocked httpx/Gemini clients.
- GridFS tests for upload/retrieve.
- Contract tests for envelopes and error codes.

Contract freeze:

- Freeze pre-planner endpoints.
- Keep planner endpoints documented as post-deployment.
- Update PRD only when a real contract correction is necessary.

### 21.7 Phase 7 detailed execution

Detailed source:

- Follow `.agents/integrationPhases.md` as the decision-complete execution plan for Phase 7.

Integration scope:

- Keep the current frontend visual experience as the target.
- Add frontend API client, env validation, typed adapters, and runtime state.
- Wire auth/account, Explore, likes, collections, trip creation, classification, recommendations, destination selection, Trip Plan detail reads, and Google Maps rendering.
- Improve backend response shapes to match current frontend mock functionality where needed.
- Keep Google Places API backend-only.
- Use Google Maps JavaScript API in the frontend only for rendering maps with `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY`.

Phase 11 boundaries:

- Do not implement real Gemini planner chat in Phase 7.
- Do not persist `trip_memo.v1`, `full_itinerary.v1`, or `budget_plan.v1` in Phase 7.
- Do not implement Trip Plan acceptance, share invites, or participants in Phase 7.
- Preserve planner preview/demo display shapes so Phase 11 can promote them later.

### 21.8 Phase 8 detailed execution

Phase 8 is intentionally retired as a standalone phase. Its former frontend foundation and frontend product-surface work is now part of Phase 7 and is detailed in `.agents/integrationPhases.md`.

### 21.9 Phase 9 detailed execution

Integrated E2E:

- Start MongoDB, API, and web.
- Seed users and data.
- Test signup/login/logout.
- Test Explore/filter/like/save/collection flow.
- Test image upload/classification/category confirmation flow.
- Test recommendation generation and destination selection.
- Test public Trip Plan detail read.
- Test Google Maps fallback path in CI.
- Test planner preview/demo route without asserting Phase 11 agent behavior.

### 21.10 Phase 10 detailed execution

Docker:

- Backend Dockerfile with Python 3.12 and uv-locked production dependencies.
- Frontend Dockerfile with Node 22 and Next.js build.
- Root local Compose with Mongo, API, and web.
- Remote Compose with Caddy, Mongo, API, and web.

Deploy:

- Caddyfile.
- Runtime env template.
- Bootstrap script.
- Preflight script.
- Deploy script.
- Rollback script.
- Smoke script.
- Ready assertion script.

GitHub Actions:

- CI for hosted-runtime paths.
- Deploy after successful main CI.
- Manual dispatch.
- Path filters excluding `.agents/**`, `docs/**`, `training/**`, `drafts/**`, `examples/**`, and root `*.md` only changes.
- No Trivy.
- No CodeQL.

### 21.11 Phase 11 detailed execution

Planner backend:

- `trip_memo.v1`
- `full_itinerary.v1`
- `budget_plan.v1`
- Planner session creation.
- Planner messages.
- Backend tools for read/update documents.
- Gemini planner adapter.
- Last-valid document preservation.
- Accept endpoint.
- Participant creation.
- Invite create/preview/join/revoke.

Planner frontend:

- Replace placeholder CTA.
- Constraints form.
- Conversation panel.
- Trip Memo panel.
- Full Itinerary panel.
- Budget Plan panel.
- Revision flow.
- Accept flow.
- Invite flow.
- Participant display.
- Replace Phase 7 planner preview/demo adapters with real planner session and document data.

Planner tests:

- Backend mocked Gemini tests.
- Document validation tests.
- Accept failure/success tests.
- Invite tests.
- Playwright planner journey.

### 21.12 Phase 12 detailed execution

Hardening:

- Request limits.
- Login rate limit.
- Provider timeout.
- Safe errors.
- Access control audit.
- UI overflow checks.
- Empty/loading/error states.
- Provider fallback review.

Handoff:

- Update `.agents/sessionHandoff.md`.
- Add ADRs under `docs/adr`.
- Update roadmap status.
- Revise README only after it is no longer annulled.

## 22. ADR Baseline and Future ADRs

The initial architecture baseline is consolidated into one ADR:

- `docs/adr/0001-snaptrip-mvp-architecture-baseline.md`

Create additional ADRs only when a later implementation session introduces or changes a durable technical decision that is not already covered by the baseline ADR.

Likely future ADR candidates:

- Versioned structured Trip Memo, Full Itinerary, and Budget Plan document schemas.
- MongoDB index and lifecycle strategy after repositories are implemented.
- Deployment rollback and backup procedure after scripts are implemented.
- Agentic planner tool boundary after planner implementation begins.
- Google Maps frontend rendering boundary if implementation expands beyond display-only maps.

## 23. CI/CD Path Filter Contract

Hosted-runtime CI/CD relevant paths:

- `app/backend/**`
- `app/frontend/**`
- `tests/**`
- `deploy/**`
- `.github/workflows/**`
- `docker-compose.yml`
- `package.json`
- `package-lock.json`
- `app/backend/pyproject.toml`
- `app/backend/uv.lock`

Non-runtime paths:

- `.agents/**`
- `docs/**`
- `training/**`

Rule:

- If a change only touches non-runtime paths, do not run hosted-runtime CI and do not deploy.
- If a change touches both runtime and non-runtime paths, run hosted-runtime CI/CD based on runtime changes.
