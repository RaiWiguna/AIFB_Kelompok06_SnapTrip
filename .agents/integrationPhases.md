# SnapTrip Frontend-Backend Integration Phases

| Field | Value |
| --- | --- |
| Document status | Active integration execution plan |
| Created | 2026-05-23 |
| Source of truth | `.agents/PRD.md`, `.agents/implementationPhase.md`, current `app/frontend/`, current `app/backend/` |
| Purpose | Detailed Phase 7 plan for integrating the current frontend with the backend while preserving the existing frontend experience |

## 1. Current State Analysis

Backend status:

- Auth, session cookies, `/auth/signup`, `/auth/login`, `/auth/logout`, and `/auth/me` exist.
- Categories, Explore, Trip Plan reads, likes, collections, trip creation sessions, image upload, classification, category confirmation, destination seeds, recommendation generation, recommendation run retrieval, selected recommendation persistence, Google Places enrichment, and Gemini recommendation boundaries exist.
- Google Places and Gemini are disabled by default in local/test and must remain backend-only.
- Place enrichment stores normalized coordinates, opening hours, ratings, Google Maps URI, and backend-safe photo descriptors.
- Trip Plan detail, account summary, liked trip listing, collection detail display shape, trip creation session recovery, and planner preview endpoints are not yet shaped for the new frontend.

Frontend status:

- The frontend in `app/frontend/` is visually complete and should be treated as the target user experience.
- Runtime pages still depend heavily on mock modules:
  - `app/frontend/lib/data.ts`
  - `app/frontend/lib/trip-detail.ts`
  - `app/frontend/lib/planner-mock.ts`
- Current frontend surfaces include landing, auth, account, Explore, likes, collections, new-trip upload/review/category/recommendation flow, planner workspace, trip detail pages, memo, itinerary, destinations, budget, invite preview, forbidden, unauthorized, and not-found states.
- Current map display is a stylized mock route map in `components/trip-route-map.tsx`; integration should replace it with Google Maps rendering when configured and keep the current static fallback when not configured.

Integration conclusion:

- Backend should adapt to the current frontend display shapes first.
- Frontend changes should be limited to API clients, typed adapters, state wiring, and the map renderer.
- Phase 7 integrates all frontend/backend functionality except the Phase 11 agentic planner, persisted planner documents, acceptance, invites, and participants.

## 2. Integration Principles

- Preserve the current frontend visual layout and interaction model unless a backend contract makes a tiny adapter change unavoidable.
- Keep business rules in backend services and data adapters, not in React components.
- Keep all user-owned mutations authenticated through FastAPI.
- Keep MongoDB, GridFS, classifier runtime, Gemini, and Google Places API inaccessible from the frontend.
- Permit Google Maps JavaScript API in the frontend only for map rendering with `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY`; this key must be browser/domain restricted and must not be a Places server key.
- Make local/test runs pass with no real Gemini, Google Places, or Google Maps keys by using backend deterministic fallbacks and frontend static map fallback.
- Prefer display-oriented backend endpoints where they reduce frontend fan-out and preserve the current UI shape.
- Keep Phase 11 boundaries explicit: real AI planner chat, persisted `trip_memo.v1`, `full_itinerary.v1`, `budget_plan.v1`, accept flow, invites, and participants are not part of Phase 7.

## 3. Phase 7 Subphases

### Phase 7.0 - Contract Audit and UI Shape Lock

Work:

- Inventory every production page and component importing:
  - `@/lib/data`
  - `@/lib/trip-detail`
  - `@/lib/planner-mock`
- Classify each import as one of:
  - replace with real backend endpoint,
  - keep as non-runtime fixture,
  - keep temporarily as Phase 11 demo-only planner behavior.
- Define frontend-facing DTOs that preserve current display fields:
  - `CurrentUserDisplay`
  - `AccountSummaryDisplay`
  - `TripCardDisplay`
  - `ExploreTripDisplay`
  - `CollectionCardDisplay`
  - `CollectionDetailDisplay`
  - `MyTripDisplay`
  - `TripCreationSessionDisplay`
  - `UploadedImageDisplay`
  - `ClassificationDisplay`
  - `RecommendationCardDisplay`
  - `TripDetailDisplay`
  - `TripMapStopDisplay`
  - `PlannerPreviewDisplay`
- Map every DTO field to either an existing backend field, a new backend display endpoint field, or a Phase 11 placeholder.

Output:

- A completed DTO/source mapping in this document or a companion implementation note.
- A clear list of frontend pages that are fully integrated versus Phase 11 contract-only.

Acceptance:

- Every current frontend page has a real backend source or an explicit Phase 11 boundary.
- No implementer needs to redesign UI fields before wiring the API.

Phase 7.0 DTO/source mapping implemented for Phase 7.1-7.3:

| Frontend surface | Runtime source classification | DTO/source |
| --- | --- | --- |
| `/signin`, `/signup` | Backend-integrated | `POST /api/auth/login`, `POST /api/auth/signup`, `CurrentUserDisplay` adapter |
| `/account` | Backend-integrated | `GET /api/account/summary`, `AccountSummaryDisplay`, `MyTripDisplay` |
| `/explore` | Backend-integrated | `GET /api/explore`, `ExploreTripDisplay` / `TripCardDisplay` |
| `/likes` | Backend-integrated | `GET /api/likes/trip-plans`, `TripCardDisplay` |
| `/collections` | Backend-integrated | `GET /api/collections`, `CollectionCardDisplay` |
| `/collections/[slug]` | Backend-integrated | `GET /api/collections/{slug_or_id}`, `CollectionDetailDisplay` / `TripCardDisplay` |
| `/new` | Backend-integrated source previews | liked trip and collection previews from backend; static `IMG` only for upload/source illustration |
| `/new/likes` | Backend-integrated source picker | `GET /api/likes/trip-plans`, `TripCardDisplay` |
| `/new/from-collections` | Backend-integrated source picker | `GET /api/collections`, `CollectionCardDisplay` |
| Marketing/landing/about/error pages | Fixture-allowed | static `IMG`, landing recommendation examples, and non-runtime copy remain in `@/lib/data` |
| `/trips/**`, `/plan/**`, `/invite/**`, planner components | Phase 11/demo boundary | `@/lib/trip-detail`, `@/lib/planner-mock`, planner/session fixtures remain until later planner/detail phases |

Display DTO defaults:

- `cover_url` values from backend are adapted into browser-safe image URLs; `/api/images/{image_id}` is prefixed with the frontend API base URL, and public placeholder assets remain relative frontend paths.
- Canonical category IDs remain backend values and are mapped to display labels/icons in frontend adapters/components.
- Backend display composition owns card counts, owner display summaries, collection slugs, collection cover grids, and account counts.

### Phase 7.1 - Frontend API Client and Runtime State

Work:

- Add frontend API modules under `app/frontend/lib/api/`:
  - `client.ts`
  - `auth.ts`
  - `explore.ts`
  - `collections.ts`
  - `trip-creation.ts`
  - `recommendations.ts`
  - `trip-plans.ts`
  - `planner-preview.ts`
  - `adapters/*`
- Add env helpers for:
  - `NEXT_PUBLIC_API_BASE_URL`
  - `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY`
- Use `credentials: "include"` for cookie-backed API calls.
- Normalize FastAPI error responses into frontend-safe error objects.
- Add typed adapters that convert backend responses into the display DTOs from Phase 7.0.
- Replace direct mock imports page by page without changing page layout.

Output:

- Shared fetch client.
- Authenticated and unauthenticated API helper functions.
- Adapter tests for key display transformations.

Acceptance:

- Frontend can call `/api/health`, `/api/auth/me`, and authenticated endpoints locally.
- Loading, error, and empty states are available without visual redesign.

### Phase 7.2 - Auth and Account Integration

Work:

- Wire signup, login, logout, and `/auth/me` into the existing auth pages and header/account surfaces.
- Replace `CURRENT_USER`, account stats, owned trips, joined trips, collection count, and liked trip count with backend-backed data.
- Keep protected-action prompts consistent with the current frontend design.

Backend-first changes:

- Add `GET /api/account/summary`.
- Response should include:
  - current user profile fields,
  - owned trip count,
  - joined trip count placeholder,
  - collection count,
  - liked trip count,
  - recent owned trips,
  - joined trips placeholder list compatible with Phase 11 participants.
- Do not implement invite joins or participant writes in this phase.

Output:

- Account page and app header use real session data.
- Unauthenticated users are handled by existing unauthorized/sign-in flows.

Acceptance:

- Signup, login, logout, and current-user flows work through cookies.
- Account page preserves the current layout with backend data.

### Phase 7.3 - Explore, Likes, Collections, and Trip Cards

Work:

- Replace `TRIPS`, `LIKED_TRIP_IDS`, and `COLLECTIONS` runtime usage for:
  - `/explore`
  - `/likes`
  - `/collections`
  - `/collections/[slug]`
  - `/new`
  - `/new/likes`
  - `/new/from-collections`
- Wire like/unlike and save/unsave collection actions to existing backend mutations.
- Preserve the current card fields:
  - title,
  - cover URL,
  - region,
  - categories,
  - days,
  - formatted budget,
  - like and save counts,
  - owner display data,
  - viewer liked/saved state.

Backend-first changes:

- Extend Explore response with display-ready card fields instead of forcing frontend fan-out.
- Add collection detail lookup by slug or stable ID.
- Add an account-scoped liked Trip Plans endpoint.
- Add collection cover and cover-grid derivation from saved public trips.
- Add image URL adapter for GridFS-backed images and safe public placeholder fallback.

Output:

- Explore, likes, and collections pages render from backend state.
- Save/unsave and like/unlike mutate backend state.

Acceptance:

- Current card design remains visually identical.
- Empty collection and liked-trip states still render.
- Unauthorized like/save actions prompt sign-in.

### Phase 7.4 - New Trip Creation and Image Classification Flow

Work:

- Wire:
  - `/new`
  - `/new/upload`
  - `/new/review-images`
  - `/new/categories`
- Replace static selected-image arrays with trip creation session state.
- Upload images to `POST /api/trip-creation-sessions/{session_id}/images`.
- Support image references from liked trips and collections through `source-images`.
- Call classification endpoint and render per-image predictions plus aggregated scores.
- Persist manual category overrides through confirm-categories.

Backend-first changes:

- Add `GET /api/trip-creation-sessions/{session_id}`.
- Return uploaded image display URLs and metadata.
- Ensure classification response includes UI-safe labels and confidence values.
- Preserve canonical category IDs as the backend source of truth.

Output:

- Multi-step new-trip flow survives reload by session ID.
- Uploaded and reused images render through backend-safe URLs.

Acceptance:

- 1-8 image validation matches backend limits.
- Category confirmation works with canonical IDs.
- Frontend remains visually equivalent to the current mock flow.

### Phase 7.5 - Recommendations and Destination Selection

Work:

- Replace `RECOMMENDATIONS` runtime usage with backend recommendation runs/items.
- Call:
  - `POST /api/trip-creation-sessions/{session_id}/recommendations`
  - `GET /api/trip-creation-sessions/{session_id}/recommendations`
  - `POST /api/trip-creation-sessions/{session_id}/selected-recommendations`
- Adapter must preserve current recommendation card fields:
  - match percent,
  - category/subcategory label,
  - cover,
  - estimated time,
  - estimated budget,
  - region,
  - reason,
  - hours,
  - estimate warning.
- Use backend warnings and source notes for current warning UI.

Backend-first changes:

- Add display adapter fields to recommendation item responses where existing fields are too raw.
- Add backend-safe place photo retrieval or proxied/signed photo URL behavior.
- Do not return raw Gemini prompts, raw Gemini output, raw Places provider payloads, or long-lived provider photo secrets.

Output:

- Recommendation page renders backend results with the same current card design.
- Selected destinations persist on the trip creation session.

Acceptance:

- Provider-disabled fallback still produces usable cards.
- Places partial/failure warnings display without breaking the page.
- Selected recommendations recover after reload.

### Phase 7.6 - Google Maps Rendering and Places Coordinates

Work:

- Replace the stylized mock route map with Google Maps rendering while preserving the `TripRouteMap` prop surface where practical.
- Use Google Maps JavaScript API in frontend for map display only.
- Use backend Places data for coordinates, place IDs, Google Maps URI, rating, address, and hours.
- Add fallback behavior when:
  - `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY` is missing,
  - Maps JS fails to load,
  - all stops lack coordinates,
  - a single stop lacks coordinates.

Backend-first changes:

- Ensure recommendation and trip destination DTOs expose:
  - `lat`,
  - `lng`,
  - `google_maps_uri`,
  - `place_enrichment_id`,
  - safe display name,
  - address or region.
- Keep Google Places calls only in backend.

Frontend implementation default:

- Add `@googlemaps/js-api-loader`.
- Add a small client component that loads Maps JS.
- Render numbered markers matching current stop order.
- Keep the existing beige/static route map as the no-key/dev/offline fallback.

Output:

- `/trips/[id]` and `/trips/[id]/destinations` show Google Maps when configured.
- Static fallback remains available and visually coherent.

Acceptance:

- No Google Places API server secret appears in the frontend bundle.
- Map pins correspond to backend coordinates.
- CI and local tests pass without Google Maps key.

### Phase 7.7 - Trip Detail, Memo, Itinerary, Budget Read Integration

Work:

- Replace `TRIP_DETAIL` and `getTripDetailFull` runtime reads for:
  - `/trips/[id]`
  - `/trips/[id]/memo`
  - `/trips/[id]/itinerary`
  - `/trips/[id]/destinations`
  - `/trips/[id]/budget`
- Backend should provide a read-optimized detail endpoint matching current page sections.

Backend-first changes:

- Add `GET /api/trip-plans/{trip_plan_id}/detail`.
- Response should include:
  - hero summary,
  - owner display summary,
  - engagement counts,
  - selected destination stops,
  - map stop coordinates,
  - memo preview/full markdown,
  - itinerary days with activity blocks,
  - budget categories and daily rows,
  - gallery image URLs.
- For pre-Phase-11 trips without accepted documents, synthesize display data from selected recommendations and Trip Plan fields.

Output:

- Public and owner trip detail pages render from backend data.
- Budget, memo, itinerary, and destinations routes keep the current display shape.

Acceptance:

- Private trip access remains owner-only until Phase 11 participants exist.
- Public accepted trips are readable without auth.
- Missing document fields use safe fallback content instead of broken UI.

### Phase 7.8 - Planner Preview Contract Boundary

Work:

- Keep `PlannerWorkspace` visually available, but mark backend integration as contract-only until Phase 11.
- Replace hard-coded planner seed data with a backend-compatible preview adapter when a trip creation session has selected recommendations.
- Preserve final target display shapes for:
  - Trip Memo,
  - Full Itinerary,
  - Budget Plan.
- Do not implement Gemini planner messages, accept endpoint, invite join, or participants in this integration phase.

Backend-first changes:

- Add optional `GET /api/planner-preview/{trip_creation_session_id}` only if needed to avoid frontend-only assembly.
- Response should be deterministic and generated from selected recommendations, confirmed categories, and default constraints.
- Response may mirror future document display formats but must not persist official Phase 11 documents.

Output:

- Planner pages can load a consistent preview/demo shape without pretending Phase 11 is complete.
- Phase 11 can later replace preview data with real planner session and document endpoints.

Acceptance:

- Planner UI stays visually identical.
- Chat and agent actions remain mock/demo until Phase 11.
- Acceptance, invites, and participants are explicitly excluded from Phase 7 implementation.

### Phase 7.9 - Integration Verification and Cleanup

Work:

- Remove or quarantine mock imports from production pages.
- Keep mock data only for tests, fixture files, or explicit Phase 11 demo fallback.
- Add Playwright smoke paths after frontend/backend wiring.
- Update env examples without real secrets.
- Update `.agents/sessionHandoff.md` after implementation.

Output:

- Production pages use backend API/adapters.
- Mock data is no longer the primary runtime source for integrated pages.

Acceptance:

- `npm run test:backend` passes.
- `npm run test:frontend` passes.
- `npm run typecheck` passes.
- `npm run lint` passes.
- `npm run build` passes.
- `npm run test:e2e` passes with integrated smoke coverage.

## 4. API and Interface Changes

Backend endpoints to add or extend:

- `GET /api/account/summary`
- `GET /api/trip-creation-sessions/{session_id}`
- `GET /api/likes/trip-plans`
- `GET /api/collections/{slug_or_id}`
- `GET /api/trip-plans/{trip_plan_id}/detail`
- Optional `GET /api/planner-preview/{trip_creation_session_id}`

Existing backend endpoints to keep and wire:

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/categories`
- `GET /api/explore`
- `POST /api/trip-plans/{trip_plan_id}/like`
- `DELETE /api/trip-plans/{trip_plan_id}/like`
- `GET /api/collections`
- `POST /api/collections`
- `PATCH /api/collections/{collection_id}`
- `DELETE /api/collections/{collection_id}`
- `POST /api/collections/{collection_id}/items/{trip_plan_id}`
- `DELETE /api/collections/{collection_id}/items/{trip_plan_id}`
- `POST /api/trip-creation-sessions`
- `POST /api/trip-creation-sessions/{session_id}/images`
- `POST /api/trip-creation-sessions/{session_id}/source-images`
- `POST /api/trip-creation-sessions/{session_id}/classify`
- `POST /api/trip-creation-sessions/{session_id}/confirm-categories`
- `POST /api/trip-creation-sessions/{session_id}/recommendations`
- `GET /api/trip-creation-sessions/{session_id}/recommendations`
- `POST /api/trip-creation-sessions/{session_id}/selected-recommendations`
- `GET /api/recommendation-runs/{run_id}`

Frontend environment additions:

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY`

Frontend adapter modules:

- `app/frontend/lib/api/client.ts`
- `app/frontend/lib/api/auth.ts`
- `app/frontend/lib/api/explore.ts`
- `app/frontend/lib/api/collections.ts`
- `app/frontend/lib/api/trip-creation.ts`
- `app/frontend/lib/api/recommendations.ts`
- `app/frontend/lib/api/trip-plans.ts`
- `app/frontend/lib/api/planner-preview.ts`
- `app/frontend/lib/api/adapters/*`

Display DTO defaults:

- Store numeric money in backend as IDR integers where possible.
- Format display labels in frontend adapters so current strings such as `IDR 9,750,000`, `Rp 2,8 jt`, and `IDR 3.0M - 5.0M / person` remain stable.
- Prefer backend-provided image URLs over frontend local mock images; use current local images only as explicit fallback fixtures.
- Preserve category IDs as canonical backend values and map to display labels/icons in frontend.

## 5. Google Maps and Places Plan

Provider boundary:

- Google Places API remains backend-only through `app/backend/app/providers/google_places.py`.
- Frontend must never call Places text search, Place Details, Place Photos, or expose Places server keys.
- Frontend may load Google Maps JavaScript API only with a public browser key restricted by domain and API scope.

Backend responsibilities:

- Fetch and cache Places enrichment.
- Normalize coordinates to `{ lat, lng }`.
- Normalize Google Maps URI, address, opening hours, rating, price level, business status, warnings, and photo descriptors.
- Return only UI-safe display fields.
- Continue deterministic seed fallback when Places is unavailable.

Frontend responsibilities:

- Load Maps JS only when `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY` is set.
- Render numbered markers from backend map stops.
- Avoid Places library usage unless a later ADR explicitly permits it.
- Render static fallback map when Maps JS is unavailable.

Verification:

- Search built frontend output or source for forbidden env names before release:
  - `GOOGLE_PLACES_API_KEY`
  - `GEMINI_API_KEY`
- Confirm `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY` is the only Google key exposed to frontend code.

## 6. Test and Acceptance Matrix

Backend tests:

- Account summary counts and auth requirements.
- Explore card shape includes owner, region, formatted budget inputs, counts, and viewer state.
- Collection list/detail includes covers and saved trip summaries.
- Liked Trip Plans endpoint returns only current-user likes.
- Trip creation session read/recovery.
- Upload, classify, confirm, recommend, and select full backend flow.
- Trip detail endpoint for public, private owner, forbidden non-owner, and missing documents.
- Google Places coordinate normalization and map-safe DTO fields.
- Places timeout, no-result, partial-result, and provider-disabled fallback behavior.

Frontend tests:

- API client includes cookies and handles normalized errors.
- Adapter tests preserve current display strings for budgets, memo, itinerary, recommendation cards, and trip cards.
- Auth/account pages render backend-backed data.
- Map component renders static fallback without a key.
- Planner preview adapter preserves Trip Memo, Full Itinerary, and Budget Plan display shapes without invoking Phase 11.

E2E tests:

- Signup, login, logout.
- Explore filter, like, and save to collection.
- New trip upload through classification and category confirmation.
- Recommendation generation and destination selection.
- Trip detail public read.
- Google Maps smoke can be mocked; default CI validates fallback map.
- Planner route loads preview/demo state but does not assert real Phase 11 agent behavior.

Release checks:

- `npm run test:backend`
- `npm run test:frontend`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run test:e2e`

## 7. Phase 11 Boundaries

Phase 7 must not implement:

- Real Gemini planner conversation.
- Backend planner tools for reading/updating persisted structured documents.
- Persisted `trip_memo.v1`.
- Persisted `full_itinerary.v1`.
- Persisted `budget_plan.v1`.
- Trip Plan acceptance endpoint.
- Share invite create/preview/join/revoke behavior.
- Participant creation or participant access-control expansion.

Phase 7 may implement:

- Deterministic planner preview data.
- Display adapters that mirror future planner document shapes.
- Disabled or demo-only planner chat behavior using the current frontend experience.
- Read-only placeholder participant/joined-trip fields in account summaries if required by current UI.

Phase 11 will replace or promote Phase 7 preview contracts into real planner contracts after deployment foundation is complete.
