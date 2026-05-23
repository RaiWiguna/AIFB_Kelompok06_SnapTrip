# 0004 Frontend Display Integration and API Adapter Boundary

| Field | Value |
| --- | --- |
| Status | Accepted |
| Date | 2026-05-23 |
| Decision scope | Frontend/backend display contracts, typed API adapters, authenticated runtime state, and mock-data quarantine |

## Context

SnapTrip's frontend was implemented as a visually complete Next.js application before the backend exposed every display shape needed by the UI. Runtime pages used local fixture modules for account, Explore, likes, collections, trip cards, planner previews, and trip details.

The integration work needed to connect real FastAPI data without redesigning the existing frontend experience. The main architectural question was where display shaping should live: in React components, in ad hoc frontend transformations, or in backend display endpoints plus typed frontend adapters.

The active constraints are:

- preserve the current frontend visual layout and interaction model;
- keep business rules and ownership checks in backend services;
- keep MongoDB, GridFS, classifier runtime, Gemini, and Google Places inaccessible from the frontend;
- allow browser-side configuration only for safe public values such as `NEXT_PUBLIC_API_BASE_URL` and the Google Maps browser key;
- leave static fixture data only for marketing imagery, visual placeholders, and explicit deferred/demo boundaries.

## Decision Drivers

- **Visual stability**: integration must not become a redesign.
- **Security**: frontend code must not receive provider secrets or storage internals.
- **Backend ownership**: display data that depends on permissions, counts, image URLs, or ownership must be composed server-side.
- **Testability**: adapters need unit coverage and E2E smoke coverage without real provider credentials.
- **Incremental migration**: existing pages can move from fixtures to API data one route at a time.
- **Maintainability**: React pages should render display data instead of reconstructing domain rules.

## Considered Options

### Option 1: Keep Fixture Modules and Patch Pages Later

- **Pros**: shortest path for continuing UI work.
- **Cons**: production routes keep lying about backend state, ownership, and persistence. This makes E2E validation meaningless.

Rejected.

### Option 2: Fetch Raw Backend Records Directly in React Components

- **Pros**: fewer backend endpoints.
- **Cons**: spreads business rules, slug derivation, image URL handling, ownership checks, and display defaults across UI components.

Rejected.

### Option 3: Add Backend Display Endpoints and Frontend API Adapters

- **Pros**: preserves UI shapes, centralizes backend rules, keeps provider/storage details out of React, and gives adapters focused test surfaces.
- **Cons**: requires additional backend response fields and adapter code.

Accepted.

## Decision

SnapTrip runtime pages will integrate through backend display endpoints and typed frontend API adapters.

Backend display composition:

- `GET /api/account/summary` returns the current user profile, owned-trip counts, joined-trip placeholders, liked-trip count, collection count, and recent trip cards.
- Explore and collection responses expose display-ready trip card fields.
- `GET /api/likes/trip-plans` returns account-scoped liked trip cards.
- `GET /api/collections/{slug_or_id}` resolves collection detail by stable ID or deterministic slug.
- `/api/images/{image_id}` streams authorized/private or public cover bytes through backend ownership rules.

Frontend API boundary:

- Shared API helpers live under `app/frontend/lib/api/`.
- Backend response types and display DTOs live in `app/frontend/lib/api/types.ts`.
- Display transformations live in `app/frontend/lib/api/adapters/*`.
- `apiFetch` sends cookies with `credentials: "include"` and normalizes FastAPI error envelopes into `ApiError`.
- Server-rendered protected pages pass the incoming cookie header to backend API helpers.
- Browser-safe image URLs are adapted through the API base URL when the backend returns `/api/images/*`.

Mock-data policy:

- Production integrated pages must not import runtime fixture modules for data that has a backend source.
- `@/lib/data` may remain for static marketing imagery, visual placeholder data, and explicit demo/deferred routes.
- Planner scripted behavior is renamed and isolated as demo-only interaction rather than generic mock seed data.

## Consequences

Positive:

- Runtime pages render backend state while preserving the existing frontend style.
- Ownership-sensitive fields such as counts, liked/saved state, collection membership, image access, and account summaries are not recomputed in React.
- Adapter tests can verify display compatibility without rendering full routes.
- Frontend source scans can distinguish allowed fixture usage from production runtime regressions.

Negative:

- Backend responses now include display-oriented fields that are not pure persistence models.
- Some frontend display DTOs duplicate shape names from mock-era components until deeper domain refactoring happens.
- Adapter coverage must be maintained whenever backend response contracts evolve.

Operational implications:

- Local and CI frontend runs require `NEXT_PUBLIC_API_BASE_URL`.
- Public browser environment variables must not contain provider secrets.
- Backend display endpoints should stay thin enough to avoid becoming separate domain models.

## Implementation Notes

- Preserve component layout and class structure unless the backend contract makes a small adapter-facing change necessary.
- Keep protected server components redirecting on `401` and showing not-found behavior for non-owned resources when the backend returns `404`.
- Use deterministic collection slugs and backend-provided card counts so links remain stable.
- Keep frontend route modules focused on fetching, adapting, and rendering.

## Related Decisions

- `0001-snaptrip-mvp-architecture-baseline.md`: establishes backend-only provider and storage boundaries.
- `0002-runtime-foundation-and-storage-boundaries.md`: establishes FastAPI/store, auth, and image streaming boundaries.
- `0003-recommendation-provider-and-structured-output-boundary.md`: establishes structured recommendation records consumed by later adapters.

## Verification

Implemented verification included:

- backend tests for account, Explore, likes, collection display, and authorization behavior;
- frontend adapter tests for display transformations;
- root `npm run test`;
- root `npm run typecheck`;
- root `npm run lint`;
- root `npm run build`;
- source scans for forbidden production imports in integrated planner/trips page and component scopes.

## Follow-up

- Expand Playwright coverage for account, Explore filtering, like/unlike, save/unsave, collection detail, and protected-route redirects.
- Revisit display DTO names once the backend contracts settle.
- Keep a narrow allowlist for fixture imports and fail tests when production pages import disallowed runtime fixtures.
