# SnapTrip

SnapTrip is an AI-native desktop-first web platform for discovering, planning, saving, and sharing trip plans.

The MVP includes:

- Explore feed for public Trip Plans.
- Likes and save-to-collection flows.
- Image-based tourism category classification.
- Curated Indonesian destination recommendations using Google Places API and Gemini through the backend.
- Agentic AI Trip Planner after deployment foundation is in place.
- Structured Trip Memo, Full Itinerary, and Budget Plan documents.
- Share invite links and participant visibility.

## Source of Truth

The canonical product and implementation documents live in `.agents/`:

- `.agents/PRD.md`
- `.agents/implementationPhase.md`
- `.agents/rules.md`
- `.agents/sessionHandoff.md`

Earlier drafts and old README assumptions are annulled when they conflict with `.agents/PRD.md`.

## Repository Layout

```text
.
|-- .agents/
|-- .github/
|   `-- workflows/
|-- app/
|   |-- backend/
|   |   |-- app/
|   |   `-- tests/
|   `-- frontend/
|       |-- app/
|       |-- components/
|       |-- lib/
|       `-- tests/
|-- deploy/
|   |-- caddy/
|   |-- compose/
|   |-- env/
|   `-- scripts/
|-- docs/
|   `-- adr/
|-- tests/
|   `-- e2e/
|-- training/
|   |-- data/
|   |-- notebook/
|   `-- output/
|-- docker-compose.yml
`-- package.json
```

Runtime code belongs under:

- `app/backend/` for Python FastAPI, `uv`, MongoDB/GridFS, classifier, and provider integrations.
- `app/frontend/` for Next.js, TypeScript, React, and Vitest.

Offline model-training assets belong under `training/` and must stay separate from runtime code.

## Tech Stack

- Frontend: Next.js, Node.js, TypeScript, Vitest.
- Backend: Python FastAPI, `uv`, PyTorch, pytest, pytest-asyncio, httpx.
- Database: self-hosted MongoDB.
- Image storage: MongoDB GridFS.
- Backend integration tests: MongoDB via testcontainers.
- E2E tests: Playwright.
- Deployment: one VM, Docker Compose, Caddy.

## Root Scripts

Root npm is the standard entrypoint for both frontend and backend workflows. Backend commands must run through `uv`.

Expected root commands:

```bash
npm install
npm run dev
npm run test
npm run typecheck
npm run lint
npm run build
npm run docker:config
```

Expected script behavior:

- `npm install` installs root tooling, frontend dependencies, and backend `uv` environment.
- `npm run dev` runs frontend and backend dev servers.
- `npm run test` runs backend pytest, frontend tests, and Playwright E2E where configured.
- `npm run typecheck` runs frontend TypeScript checks and backend static validation.
- `npm run lint` runs frontend lint and backend lint/format checks.
- `npm run build` runs frontend build and backend build-validation checks.
- `npm run docker:config` validates local and remote Docker Compose config.

The root `package.json` is implemented and should remain the standard command surface.

## Local Development Status

The integrated product runtime and Phase 10 deployment foundation are implemented.

Implemented foundations:

- Root npm scripts for install, dev, test, typecheck, lint, build, and Docker config.
- FastAPI backend with health/readiness, auth, Explore, likes, collections, trip creation sessions, image upload/GridFS, mock classifier flow, category confirmation, recommendations, planner preview, and trip detail reads.
- Next.js frontend integrated with backend APIs for the pre-planner MVP flows.
- Local Docker Compose for MongoDB, API, and web.
- Remote Docker Compose for Caddy, MongoDB, API, and web.
- GitHub Actions CI and production deploy workflows.

Copy `.env.local.example`, `app/backend/.env.local.example`, and `app/frontend/.env.local.example` to local `.env.local` files for development values. Real `.env.local` files are ignored.

Recommended next start is Phase 11 from `.agents/implementationPhase.md`: agentic planner documents, acceptance, invites, participants, and planner UI.

## Deployment Targets

- Web: `https://snaptrip.site`
- API: `https://api.snaptrip.site`

Production deployment uses:

- `deploy/compose/docker-compose.remote.yml`
- `deploy/caddy/Caddyfile`
- `deploy/scripts/*`
- `.github/workflows/ci.yml`
- `.github/workflows/deploy-production.yml`
- `/opt/snaptrip/hosted/releases/<sha>`
- `/opt/snaptrip/hosted/current`
- `/opt/snaptrip/hosted/shared`

Root `docker-compose.yml` is local development only.

See `.agents/deploymentGuide.md` for VM bootstrap, GitHub Secrets, deploy, and rollback instructions.

## Contributing

See `CONTRIBUTING.md`.
