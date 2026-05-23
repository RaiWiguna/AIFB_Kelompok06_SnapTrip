# 0006 Trip Plan Detail Read Model and Map Rendering Boundary

| Field | Value |
| --- | --- |
| Status | Accepted |
| Date | 2026-05-23 |
| Decision scope | Trip Plan detail display endpoint, synthesized read models, visibility rules, map-safe coordinates, and Google Maps browser rendering |

## Context

The frontend includes Trip Plan detail pages for overview, memo, itinerary, destinations, and budget. These pages need rich read data even before real persisted planner documents are implemented. At the same time, the product contract keeps official planner documents, accepted trip conversion, invites, and participants in a later flow.

The map component also needed integration. Google Places remains backend-only, but a browser-restricted Google Maps JavaScript key is acceptable for rendering maps in the frontend. Local and CI environments must still pass without a Maps key.

## Decision Drivers

- **Read stability**: detail pages need one read-optimized contract instead of frontend fan-out.
- **Boundary honesty**: synthesized detail data must not pretend official planner documents exist.
- **Authorization**: public, private, and invite-only Trip Plans need backend read checks.
- **Map security**: Places/provider keys stay backend-only; browser map rendering uses a separate restricted key.
- **Fallback behavior**: local, CI, no-key, no-coordinate, and Maps-load-failure paths must still render a visual map fallback.

## Considered Options

### Option 1: Let Frontend Build Detail Pages From Multiple Raw APIs

- **Pros**: fewer backend read models.
- **Cons**: duplicates synthesis logic in React and spreads visibility handling across pages.

Rejected.

### Option 2: Persist Placeholder Planner Documents Early

- **Pros**: detail pages can read realistic document shapes.
- **Cons**: confuses preview/demo data with official `trip_memo.v1`, `full_itinerary.v1`, and `budget_plan.v1` documents.

Rejected.

### Option 3: Backend Detail Read Model With Explicit Synthesis

- **Pros**: pages get stable display data while official planner documents remain deferred.
- **Cons**: read service must clearly mark synthesized fields and avoid writing them as canonical planner artifacts.

Accepted.

## Decision

Trip Plan detail pages read through a backend display endpoint.

Backend read model:

- `GET /api/trip-plans/{trip_plan_id}/detail` returns hero summary, selected destinations, memo, itinerary, budget, gallery, engagement, owner, participants placeholder data, and map-safe coordinates.
- Public accepted Trip Plans are anonymous-readable.
- Private or invite-only Trip Plan detail reads are owner-only until real invite/participant behavior exists.
- Missing memo, itinerary, budget, gallery, and destination data may be synthesized from selected recommendations or curated destination seeds.
- Synthesized fields are read-only display data and must not create official persisted planner documents.

Frontend integration:

- `/trips/[id]`, `/trips/[id]/memo`, `/trips/[id]/itinerary`, `/trips/[id]/destinations`, and `/trips/[id]/budget` consume the detail API through frontend adapters.
- The existing visual page shells remain intact.
- Participants remain placeholder/display-only unless returned by later participant APIs.

Map boundary:

- Backend may return map-safe coordinates, addresses, Google Maps URIs, and place enrichment IDs.
- Frontend may use `@googlemaps/js-api-loader` only with `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY`.
- The frontend must not use Google Places server keys or Places APIs.
- If no browser key, coordinates, or successful Maps load is available, the current static route map fallback renders instead.

## Consequences

Positive:

- Trip detail pages use real backend authorization and a single display contract.
- The frontend can render useful memo/itinerary/budget pages before official planner documents exist.
- Provider secrets remain isolated while map rendering can still become interactive in configured browser environments.
- CI and local development remain deterministic without Maps credentials.

Negative:

- Synthesized read data can be mistaken for persisted planner content unless boundaries stay explicit.
- Detail read service grows display-composition logic.
- Map rendering now has dual paths that both need regression coverage.

Operational implications:

- `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY` must be browser/domain restricted and must not be a Places server key.
- Production deployment needs separate environment handling for backend Places keys and frontend Maps rendering keys.
- Static fallback map behavior remains part of the supported experience.

## Implementation Notes

- Use backend adapters/services to synthesize display content; do not synthesize planner documents in React.
- Keep `trip_memo.v1`, `full_itinerary.v1`, and `budget_plan.v1` absent unless the official planner flow persists them later.
- Treat missing coordinates as a normal fallback path, not an error.
- Keep Google Maps loading failures non-fatal.

## Related Decisions

- `0001-snaptrip-mvp-architecture-baseline.md`: establishes backend-only provider access.
- `0003-recommendation-provider-and-structured-output-boundary.md`: establishes selected recommendation items as valid detail synthesis inputs.
- `0004-frontend-display-integration-and-api-adapter-boundary.md`: establishes display endpoints and frontend adapters.
- `0005-trip-creation-media-and-recommendation-handoff-boundary.md`: establishes selected-destination handoff.

## Verification

Implemented verification included:

- backend tests for trip detail display contracts and visibility behavior;
- frontend adapter tests for trip detail display shapes;
- root `npm run test`;
- root `npm run typecheck`;
- root `npm run lint`;
- root `npm run build`;
- frontend source scans confirming no backend provider secret names are present in frontend code.

## Follow-up

- Add Playwright coverage for trip detail overview, memo, itinerary, destinations, budget, and static map fallback.
- Add browser-key configured smoke coverage for Google Maps markers in a controlled environment.
- Replace synthesized memo/itinerary/budget reads with persisted planner documents only when the official planner flow is implemented.
