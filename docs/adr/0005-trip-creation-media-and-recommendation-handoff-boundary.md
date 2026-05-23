# 0005 Trip Creation Media and Recommendation Handoff Boundary

| Field | Value |
| --- | --- |
| Status | Accepted |
| Date | 2026-05-23 |
| Decision scope | Trip creation session recovery, image/source-image handling, classifier inputs, recommendation display adapters, and selected-destination handoff |

## Context

The new-trip flow spans upload, image review, category confirmation, recommendation generation, recommendation selection, and planner handoff. The frontend previously represented these steps with local arrays and mock recommendations. The backend already had trip creation sessions, upload validation, classifier boundaries, curated destination seeds, recommendation runs, and selected recommendation persistence.

The integration needed a durable rule for what may be sent to classifier and recommendation APIs. Static frontend assets are useful for display, but they must not become classifier inputs or pretend to be stored user images.

## Decision Drivers

- **Source integrity**: classifier inputs must refer to backend-owned upload or source-image records.
- **Reload safety**: multi-step flow state must survive refresh and route changes through session state.
- **Provider isolation**: Gemini, Google Places, classifier runtime, and raw image storage remain backend-only.
- **Frontend continuity**: pages keep the current upload/review/category/recommendation layouts.
- **Handoff clarity**: planner preview and later planner flows consume selected recommendation item IDs, not reconstructed card data.

## Considered Options

### Option 1: Keep Frontend-Only Flow State

- **Pros**: simple route implementation.
- **Cons**: refresh loses state, classifier source validation is weak, and selected destinations cannot be trusted by backend planner flows.

Rejected.

### Option 2: Let Frontend Submit Any Image URL for Classification

- **Pros**: easy to reuse static assets and trip-card covers.
- **Cons**: allows arbitrary URL handling, blurs public/static images with owned media, and risks provider or storage leakage.

Rejected.

### Option 3: Session-Centered Backend State With Safe Source Image References

- **Pros**: preserves reload behavior, validates ownership, separates display imagery from classifier inputs, and creates a clean recommendation-to-planner handoff.
- **Cons**: requires additional session read shapes, image URL adaptation, and source-image metadata on trip cards.

Accepted.

## Decision

Trip creation state is owned by backend `tripCreationSessions` records.

Session recovery:

- `GET /api/trip-creation-sessions/{session_id}` returns uploaded/source images, latest classification, latest recommendations, and selected recommendation IDs for the authenticated owner.
- Frontend new-trip pages use this endpoint to recover state after refresh.

Media boundary:

- Uploaded images go through `POST /api/trip-creation-sessions/{session_id}/images` with backend validation.
- Source images selected from liked trips or collections must be backend-recognized public covers or user-owned images.
- Trip cards may expose optional `source_image_id` only when the backend can accept that image as classifier input.
- Static frontend images remain display fallbacks only and must not be sent to classifier APIs.
- Browser image rendering uses backend-safe URLs such as `/api/images/{image_id}` adapted through the configured API base URL.

Classifier and category boundary:

- Classification is invoked against backend-validated session image refs.
- Classification output remains constrained to canonical category IDs.
- Manual category confirmation persists canonical IDs back onto the trip creation session.

Recommendation handoff:

- Recommendation generation and retrieval use persisted backend `recommendationRuns` and `recommendationItems`.
- The frontend adapts recommendation items into the current card display shape.
- Selected destinations are persisted as recommendation item IDs on the session.
- Later planner surfaces read selected IDs instead of trusting frontend card payloads.

## Consequences

Positive:

- The new-trip flow survives browser reload and direct route entry.
- Classifier input validation stays backend-enforced.
- Static marketing or placeholder images cannot accidentally become classifier sources.
- Recommendation cards and selected destinations have stable backend IDs for planner handoff.

Negative:

- Frontend source pickers need to distinguish display-only covers from classifier-usable source images.
- Session recovery endpoints carry more display data than a pure command API.
- Tests must cover both uploaded images and reused source-image refs.

Operational implications:

- Local/test runs continue to use mock classifier mode unless real classifier artifacts are configured.
- Provider calls remain disabled or mocked by default in automated tests.
- Image reads depend on backend authorization and GridFS-compatible storage behavior.

## Implementation Notes

- Keep source-image references as backend IDs, not arbitrary frontend URLs.
- Do not expose GridFS internals, file paths, or provider photo resource names to the browser.
- Use adapter-level display defaults for recommendation cards rather than adding card-specific logic to route components.
- Treat missing selected recommendation IDs as an explicit pre-planner boundary condition.

## Related Decisions

- `0002-runtime-foundation-and-storage-boundaries.md`: establishes store, image, auth, and classifier boundaries.
- `0003-recommendation-provider-and-structured-output-boundary.md`: establishes recommendation provider orchestration and selected item persistence.
- `0004-frontend-display-integration-and-api-adapter-boundary.md`: establishes API adapters and mock-data quarantine.

## Verification

Implemented verification included:

- backend tests for trip creation session reads, source-image validation, classification, category confirmation, recommendations, and selected recommendation persistence;
- frontend adapter tests for trip creation and recommendation display shapes;
- root `npm run test`;
- root `npm run typecheck`;
- root `npm run lint`;
- root `npm run build`;
- frontend source scans confirming provider secret names are not present in frontend code.

## Follow-up

- Add Playwright coverage for upload, reused source images, category confirmation, recommendation generation, and selected-destination persistence.
- Expand MongoDB/GridFS testcontainers coverage for uploaded image reads when Docker is available.
- Add negative tests for static/frontend-only image paths submitted as classifier inputs.
