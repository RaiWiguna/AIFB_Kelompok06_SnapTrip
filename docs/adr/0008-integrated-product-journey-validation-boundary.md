# 0008 Integrated Product Journey Validation Boundary

| Field | Value |
| --- | --- |
| Status | Accepted |
| Date | 2026-05-23 |
| Decision scope | Integrated Playwright validation, test-only memory seeding, frontend/backend journey coverage, and collection-save validation UI |

## Context

SnapTrip now has backend-backed frontend flows for auth, Explore, likes, collections, trip creation, classification, recommendations, planner preview, Trip Plan detail reads, and map fallback. The next risk was integration drift: unit and API tests could pass while the actual browser journey failed because of missing seed data, cross-origin settings, frontend-only gaps, or provider key assumptions.

The product journey validation needed deterministic public Trip Plans across all four canonical categories, authenticated user state, uploaded image flows, and selected recommendations. CI and local E2E must not depend on real Gemini, Google Places, Google Maps, MongoDB, or stale developer servers.

One user-facing gap also blocked product-level validation: trip cards exposed likes but did not provide a complete save-to-collection path, even though the backend already supported collection creation and saving.

## Decision Drivers

- **Determinism**: integrated browser tests must start from known data every run.
- **Safety**: test seeding must not be available in development or production runtime.
- **Provider isolation**: CI must run with Gemini, Google Places, and Google Maps disabled.
- **Journey fidelity**: Playwright should exercise real frontend interactions and backend APIs, not only backend request setup.
- **Scope control**: validation must preserve the deferred planner acceptance, invite, participant, and persisted document boundaries.

## Considered Options

### Option 1: Seed Test Data Only Through Public Product APIs

- **Pros**: no test-only route.
- **Cons**: public APIs cannot create accepted public Trip Plans or private control records yet, so Explore and Trip Detail validation would remain incomplete or overly coupled to future acceptance work.

Rejected.

### Option 2: Use Static Frontend Fixtures for E2E

- **Pros**: simple and fast.
- **Cons**: would not validate frontend/backend integration, cookie-backed mutations, uploaded image handling, recommendation persistence, or map fallback contracts.

Rejected.

### Option 3: Add a Test-Only Reset and Seed Boundary

- **Pros**: deterministic, isolated, fast, and validates the integrated runtime without real providers.
- **Cons**: introduces a route that must remain strictly gated to `APP_ENV=test` and memory storage.

Accepted.

## Decision

Integrated product journey validation uses a test-only backend seeding endpoint and browser-level Playwright journeys.

Backend boundary:

- `POST /api/testing/reset-product-journeys` is registered only when `APP_ENV=test`.
- The route requires the in-memory store shape and refuses non-memory storage.
- The route clears memory-mode runtime collections, reseeds destination seeds, creates deterministic public accepted Trip Plans for `pantai`, `gunung`, `air_terjun`, and `wisata_tradisional`, and creates one private control Trip Plan.
- The route seeds small in-memory PNG cover bytes so image streaming and source-image flows can use backend-owned images.
- The route is not part of the public product contract and must not be enabled in development or production.

Frontend/backend validation boundary:

- Playwright starts its own memory-mode FastAPI server and Next.js dev server.
- Stale local server reuse remains disabled.
- E2E runs serially because the reset-and-seed route mutates shared in-memory backend state.
- Playwright backend env explicitly allows the `127.0.0.1:3000` test origin.
- Provider keys remain blank and disabled; Google Maps rendering is validated through the static fallback path.

Collection-save UI boundary:

- Trip card display responses include viewer-specific `saved` state alongside `liked` state.
- The frontend trip card includes a compact save-to-collection control beside the existing like control.
- The save control lists existing collections and supports inline collection creation before saving.
- The control redirects unauthenticated users through contextual sign-in rather than exposing collection mutations.

## Consequences

Positive:

- Integrated E2E now validates the main pre-planner product journeys through real browser interactions.
- Explore category filtering, like/save state, collection persistence, upload/classification, recommendation selection, planner preview, public Trip Plan reads, and static map fallback are covered without external provider keys.
- The collection-save interaction now matches the backend capability and product flow.
- The next implementation work can focus on deployment foundation with stronger confidence in the integrated product baseline.

Negative:

- The test-only route is an extra runtime module that must remain gated and excluded from production behavior.
- E2E is intentionally serial, so the suite trades some parallel speed for deterministic shared-state resets.
- The E2E suite validates memory-mode integration, not MongoDB/GridFS persistence.

Operational implications:

- CI must keep `APP_ENV=test`, `SNAPTRIP_STORAGE=memory`, `USE_GEMINI=false`, `USE_GOOGLE_PLACES=false`, and an empty `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY` for default E2E.
- If E2E later needs MongoDB-backed validation, add separate tests rather than relaxing this memory-mode contract.
- Do not expose `/api/testing/*` outside test configuration.

## Implementation Notes

- Keep all testing routes in `app/backend/app/api/testing.py`.
- Keep route registration conditional in the API router, not inside route handlers alone.
- Use backend display adapters for saved viewer state so React components do not own collection policy.
- Keep the save control compact within `TripCard` and avoid redesigning Explore or collection pages.
- Keep planner preview assertions bounded to rendered preview documents and disabled acceptance.

## Related Decisions

- `0002-runtime-foundation-and-storage-boundaries.md`: establishes memory storage for tests and MongoDB/GridFS for runtime.
- `0004-frontend-display-integration-and-api-adapter-boundary.md`: establishes frontend display adapters.
- `0005-trip-creation-media-and-recommendation-handoff-boundary.md`: establishes trip creation and selected recommendation handoff.
- `0006-trip-plan-detail-read-model-and-map-rendering-boundary.md`: establishes Trip Plan detail read and map fallback boundaries.
- `0007-planner-preview-and-deferred-acceptance-boundary.md`: establishes preview-only planner behavior and disabled acceptance.

## Verification

Implemented verification included:

- backend tests for saved viewer state and the test-only product journey seed response;
- frontend tests for existing adapters and planner preview rendering;
- Playwright tests for signup/login/logout, Explore filtering across all canonical categories, like/save/create collection, image upload/classification/category confirmation, deterministic recommendations, selected destination handoff, planner preview, public Trip Plan detail, and static map fallback;
- root `npm run test:backend`;
- root `npm run test:frontend`;
- root `npm run typecheck`;
- root `npm run lint`;
- root `npm run test:e2e`;
- root `npm run test`;
- root `npm run build`;
- root `npm run docker:config`;
- frontend source scan for `GOOGLE_PLACES_API_KEY` and `GEMINI_API_KEY`.

## Follow-up

- Implement Docker, remote compose, Caddy, GitHub Actions, and rollback next.
- Keep real planner acceptance, invites, participants, and persisted structured documents deferred until after deployment foundation.
- Add MongoDB-backed E2E or integration coverage separately if deployment hardening requires persistence-level browser validation.
