# SnapTrip Technical PRD

| Field | Value |
| --- | --- |
| Document status | Canonical replacement PRD for implementation |
| Last updated | 2026-05-08 |
| Primary timezone | Asia/Jakarta |
| Scope type | MVP implementation-ready technical PRD |
| Canonical location | `.agents/PRD.md` |
| Product | SnapTrip |
| Runtime target | Desktop-first web app on one VM |

## 1. Source of Truth and Annulled Documents

This document is the new product and technical source of truth for SnapTrip MVP.

The following documents are annulled as canonical references because they are pending revision:

- `drafts/**`
- `README.md`

Those files may still be used as historical context only. Future implementation decisions must follow this PRD when it conflicts with `drafts/**`, `README.md`, or earlier repository assumptions.

Known annulled conflicts:

- Old documents mention PostgreSQL. SnapTrip MVP now uses self-hosted MongoDB.
- Old documents mention TensorFlow/Keras. SnapTrip MVP now uses PyTorch with MobileNetV2.
- Old documents describe a simpler no-auth session flow. SnapTrip MVP now requires email/password accounts for ownership, likes, collections, invites, and participants.
- Old documents describe local-only deployment. SnapTrip MVP now requires one-VM Docker Compose deployment with Caddy and GitHub Actions.
- Old documents describe broad category lists. SnapTrip MVP uses exactly four canonical tourism categories for classifier output and Explore filtering.

## 2. Product Summary

SnapTrip is an AI-native desktop-view web platform for planning, discovering, saving, and sharing trip plans. The product combines social trip discovery, image-based preference inference, AI-assisted destination recommendation, and an agentic trip-planning workspace.

Core surfaces:

- Explore feed for browsing public trip plans from other users.
- Category filters for `pantai`, `gunung`, `air_terjun`, and `wisata_tradisional`.
- Like and save-to-collection actions on trip plans.
- Collection management for saved trip plans and reusable visual inspiration.
- Trip creation flow from uploaded images or images selected from likes/collections.
- AI destination recommendation flow using:
  - PyTorch MobileNetV2 classifier.
  - Predefined curated Indonesian destination seed data.
  - Google Places API.
  - Gemini structured output.
- AI Trip Planner workspace using Gemini under the hood with backend tools for web research and structured trip-document access.
- Accepted Trip Plan detail containing structured Trip Memo, Full Itinerary, and Budget Plan documents.
- Share invite links so other users can join or view a trip plan.

Hosted runtime:

- Frontend: Next.js, Node.js, TypeScript, Vitest.
- Backend and image classifier: Python FastAPI, `uv`, PyTorch MobileNetV2, pytest, pytest-asyncio, httpx.
- Database: self-hosted MongoDB.
- Image storage: MongoDB GridFS.
- E2E tests: Playwright.
- Deployment: Docker Compose on a VM, Caddy for reverse proxy/TLS, GitHub Actions for CI/CD.

Public domains:

- Web frontend: `https://snaptrip.site`
- Backend API: `https://api.snaptrip.site`

All application data mutations must go through the FastAPI backend. The frontend must never call MongoDB, GridFS, Gemini, Google Places API, or the classifier directly.

## 3. Goals, Success Metrics, and Non-Goals

### 3.1 Primary Goals

- Provide a polished desktop web experience for discovering and planning trips.
- Let users browse public trip plans and filter by the four canonical tourism categories.
- Let authenticated users like trip plans and save them to new or existing collections.
- Let users start a new trip plan from uploaded images or selected images from liked/saved trip plans.
- Use a PyTorch MobileNetV2 classifier to infer tourism category preferences from multiple images.
- Use curated Indonesian seed destinations as the controlled recommendation base.
- Enrich candidate destinations through Google Places API before sending normalized place data to Gemini.
- Use Gemini to generate structured recommendation cards, not raw chat text.
- Provide an agentic AI Trip Planner that can draft and revise trip documents from user constraints.
- Persist final Trip Memo, Full Itinerary, and Budget Plan as structured documents inside one accepted Trip Plan.
- Allow users to share an accepted Trip Plan through an invite link and show trip participants.
- Deploy through a repeatable one-VM Docker Compose flow with rollback.

### 3.2 Success Metrics

- A user can browse Explore, filter by category, open a trip plan, like it, and save it to a collection.
- A user can create a collection during the save flow without leaving the current context.
- A user can start a new trip from 1 to 8 uploaded images or selected saved/liked images.
- Classifier output always maps to one or more of the four canonical categories.
- Backend stores uploaded images in GridFS and stores only safe metadata in normal MongoDB collections.
- Recommendation generation returns structured destination cards with description, opening hours, estimated cost, location metadata, and image snaps.
- Gemini recommendation output is rejected or repaired when it does not satisfy the structured schema.
- Planner agent can revise itinerary, budget, and memo documents based on conversation constraints.
- Final accepted Trip Plan always contains all three required structured documents.
- Explore only shows trip plans explicitly marked public.
- Share invite links allow invited users to access the trip plan and show participant membership.
- Root npm scripts can install, test, typecheck, lint, and build the full repo from the root directory.
- Hosted deployment validates readiness and rolls back to the previous release when post-deploy checks fail.

### 3.3 Non-Goals for MVP

- No native mobile app.
- No marketplace booking, ticketing, hotel booking, or payment flow.
- No real-time collaborative document editing.
- No broad global destination coverage.
- No user-generated destination database beyond curated seed and accepted trip plans.
- No direct frontend access to Gemini, Google Places API, MongoDB, GridFS, or classifier runtime.
- No production-grade recommender personalization beyond likes, collections, selected categories, and explicit constraints.
- No multi-tenant organization or admin back office.
- No OAuth requirement for MVP.
- No streaming LLM response requirement.
- No raw markdown/chat-only final itinerary display.
- No Trivy or CodeQL requirement in CI/CD.

## 4. Confirmed Decisions

| Area | Decision |
| --- | --- |
| Product surface | Desktop-first web app |
| Frontend | Next.js, Node.js, TypeScript, Vitest |
| Backend | Python FastAPI |
| Backend package manager | `uv` |
| Image classifier | PyTorch MobileNetV2 |
| Database | Self-hosted MongoDB |
| Image storage | MongoDB GridFS |
| Backend tests | pytest, pytest-asyncio, httpx, testcontainers |
| E2E tests | Playwright |
| Auth | Email/password login with session cookie |
| Destination scope | Curated Indonesian destinations |
| Recommendation enrichment | Google Places API |
| LLM provider | Gemini |
| Local compose | Root `docker-compose.yml` only |
| Remote compose | `deploy/compose/docker-compose.remote.yml` |
| Reverse proxy | Caddy |
| Web domain | `snaptrip.site` |
| API domain | `api.snaptrip.site` |
| CI/CD | SnapTrip SSH source-archive deployment to single VM |
| Explicit CI/CD exclusions | Trivy and CodeQL |

Canonical tourism categories:

- `pantai`
- `gunung`
- `air_terjun`
- `wisata_tradisional`

Structured-output rule:

- Every LLM or agent output must be validated into structured JSON before persistence and UI rendering.
- Raw LLM text must not become canonical Trip Plan content.

## 5. Constraints and Product Risks

### 5.1 Product Constraints

- The MVP category taxonomy is intentionally small and fixed.
- Explore depends on public trip plans. Early demo environments need seed or fixture trip plans.
- Destination recommendation quality depends on curated seed quality and Places API availability.
- Google Places API photo references must not be exposed as long-lived raw backend secrets.
- Gemini output must be treated as untrusted until schema validation succeeds.
- Trip costs and opening hours can change; UI must show estimates and source notes.
- Share invite links expose trip documents to invited users, so access control must be explicit.

### 5.2 Technical Risks

- PyTorch and image-processing dependencies can make backend container builds large.
- Classifier inference can be slower on a CPU-only VM runtime.
- GridFS can grow quickly if uploads are not limited.
- Places API quotas or billing issues can break enrichment.
- Gemini may return invalid JSON or hallucinated fields if prompt and validation are weak.
- Agentic tool calls can become expensive or slow without timeouts and per-session limits.
- Single-VM monolith simplifies operations but creates a shared blast radius for frontend, backend, MongoDB, Caddy, and classifier runtime.
- Docker Compose build on the VM can fail if dependency locks are inconsistent.

## 6. Users and Roles

### 6.1 Authenticated Traveler

Authenticated travelers are primary users with an email/password account.

Capabilities:

- Sign up, log in, log out, and maintain a session.
- Browse Explore.
- Filter public trip plans by tourism category.
- Open public Trip Plan detail.
- Like and unlike public trip plans.
- Save trip plans to a new or existing collection.
- Create, rename, and delete personal collections.
- Start a new trip plan from uploaded images.
- Start a new trip plan from images associated with liked or saved trip plans.
- Confirm or correct classifier categories.
- Review AI-generated destination cards.
- Select destinations for planning.
- Chat with the AI Trip Planner.
- Accept a final Trip Plan.
- Mark accepted Trip Plan visibility as private or public.
- Generate and revoke share invite links.
- View participant list on owned or joined trip plans.

Limitations:

- Cannot edit another user's accepted trip documents unless explicitly supported by a future collaboration feature.
- Cannot modify curated destination seed data.
- Cannot call provider APIs directly.

### 6.2 Public or Unauthenticated Explore Visitor

Public visitors can browse discovery content without logging in.

Capabilities:

- Open `snaptrip.site`.
- Browse Explore feed.
- Filter Explore by the four categories.
- Open public Trip Plan detail in read-only mode.

Limitations:

- Must log in before liking.
- Must log in before saving to collection.
- Must log in before starting trip creation.
- Cannot access invite-only or private Trip Plans unless authenticated and authorized.

### 6.3 Invited Collaborator or Viewer

Invited users access an accepted Trip Plan through an invite link.

Capabilities:

- Open invite link.
- Preview invite status.
- Log in or sign up if required.
- Join the Trip Plan as a participant.
- View Trip Memo, Full Itinerary, Budget Plan, selected destinations, and participant list.

MVP limitations:

- Role is viewer by default.
- No real-time collaborative editing.
- No direct mutation of accepted documents by invited participants.

### 6.4 System and AI Services

System actors:

- Image classifier service inside FastAPI process or backend-managed runtime.
- Recommendation orchestrator inside backend service layer.
- Gemini recommendation generation.
- Gemini planner agent.
- Google Places integration.
- MongoDB and GridFS.

System obligations:

- Keep provider calls backend-only.
- Validate all AI outputs before persistence.
- Persist enough metadata for debugging and fallback behavior without exposing secrets.
- Preserve last valid structured planner documents when AI/tool calls fail.

## 7. Scope Overview

### 7.1 Frontend Scope

- Desktop-first Next.js web app.
- Explore feed/grid.
- Category filtering.
- Trip Plan detail view.
- Auth pages and session-aware navigation.
- Like/save controls.
- Collection selector and inline collection creation.
- Trip creation image source picker.
- Image upload UI.
- Classifier result review and manual correction UI.
- Recommendation card UI.
- AI Trip Planner workspace.
- Structured document panels for Trip Memo, Full Itinerary, and Budget Plan.
- Accepted Trip Plan detail view.
- Invite and participant view.
- Polished loading, empty, error, fallback, unauthorized, and invalid-invite states.

### 7.2 Backend API Scope

- Auth/session APIs.
- User profile APIs.
- Explore APIs.
- Trip Plan read APIs.
- Like APIs.
- Collection APIs.
- GridFS-backed image upload/read APIs.
- Trip creation session APIs.
- Classification APIs.
- Category confirmation APIs.
- Destination seed lookup.
- Google Places enrichment.
- Gemini recommendation orchestration.
- Recommendation persistence.
- Planner session APIs.
- Planner message APIs.
- Structured document APIs.
- Trip Plan acceptance and visibility APIs.
- Share invite and participant APIs.
- Health and readiness APIs.

### 7.3 AI Scope

- Four-label image classification with MobileNetV2.
- Aggregation of predictions across multiple images.
- Manual category correction fallback.
- Category-to-destination seed matching.
- Places API enrichment normalization.
- Gemini structured recommendation generation.
- Gemini agentic planner with backend-mediated tools.
- Structured document validation and versioning.

### 7.4 Deployment Scope

- Root local `docker-compose.yml` for development only.
- Remote production compose at `deploy/compose/docker-compose.remote.yml`.
- Caddy reverse proxy and TLS.
- Single-VM release layout.
- Source archive upload over SSH.
- Runtime env rendering.
- Smoke/readiness checks.
- Rollback to previous release on failed validation.

## 8. End-to-End User Flows

### 8.1 Explore Discovery Flow

1. User opens `snaptrip.site`.
2. Web app loads Explore feed.
3. User scrolls public trip plans.
4. User applies one or more category filters:
   - `pantai`
   - `gunung`
   - `air_terjun`
   - `wisata_tradisional`
5. User opens a Trip Plan detail.
6. If unauthenticated, user can read public content but sees login prompts for like/save/create.
7. If authenticated, user can like the plan.
8. User clicks save.
9. User selects an existing collection or creates a new collection inline.
10. Backend persists save state and returns updated collection metadata.

### 8.2 Flow 1: Image Classifier Preference Flow

1. Authenticated user starts a new trip.
2. User chooses image source:
   - Upload 1 to 8 images.
   - Select images from liked Trip Plans.
   - Select images from saved collection Trip Plans.
3. Frontend validates file count, file type, and visible size constraints before upload.
4. Backend validates images again.
5. Backend stores uploaded files or selected image references in GridFS/image metadata.
6. Backend preprocesses images to classifier input format.
7. PyTorch MobileNetV2 classifier returns per-image category confidence scores.
8. Backend aggregates predictions across all images.
9. UI shows predicted categories with confidence and source images.
10. User confirms or manually corrects category labels.
11. Backend stores confirmed categories on the trip creation session.

Completion criteria:

- Session has at least one confirmed category.
- Confirmed categories are canonical category IDs only.
- Manual confirmation overrides classifier confidence for downstream recommendation.

### 8.3 Flow 2: Places API plus Gemini Recommendation Flow

1. Backend receives confirmed categories.
2. Backend loads curated Indonesian destination seeds matching those categories.
3. Backend selects candidate destinations per category.
4. Backend queries Google Places API for each candidate destination.
5. Backend normalizes each Places response into internal place data.
6. Backend combines seed data and Places data.
7. Backend sends normalized candidate list to Gemini with a structured output schema.
8. Gemini returns destination recommendations as structured JSON.
9. Backend validates output.
10. Backend persists `RecommendationRun` and `RecommendationItem` records.
11. UI renders polished destination cards.
12. User selects one or more destinations.
13. User can continue to AI Trip Planner.

Destination cards must include:

- Destination name.
- Categories.
- Description.
- Opening hours summary.
- Estimated cost.
- Location metadata.
- Image snaps.
- Match reason.
- Notes or warnings when data is estimated or incomplete.

### 8.4 Flow 3: Agentic AI Trip Planner Flow

1. User enters the AI Trip Planner workspace from selected recommendations.
2. Backend creates a `TripPlannerSession`.
3. User provides constraints such as:
   - Destination preference.
   - Trip duration.
   - Budget.
   - Group size.
   - Transportation mode.
   - Pace.
   - Special notes.
4. Gemini planner agent drafts initial structured documents.
5. UI renders:
   - Conversation workspace.
   - Trip Memo panel.
   - Full Itinerary panel.
   - Budget Plan panel.
6. User asks revisions through conversation.
7. Agent uses allowed tools to research, read current documents, and update structured drafts.
8. Backend validates updated documents.
9. UI updates structured panels.
10. User accepts final plan.
11. Backend saves Trip Memo, Full Itinerary, and Budget Plan inside one Trip Plan.

### 8.5 Trip Finalization Flow

1. User reviews the latest structured Trip Memo, Full Itinerary, and Budget Plan.
2. User clicks accept.
3. Backend validates all required document sections.
4. Backend creates or updates `TripPlan` with status `accepted`.
5. Backend sets visibility:
   - `private`
   - `invite_only`
   - `public`
6. Backend stores participant owner record.
7. UI navigates to accepted Trip Plan detail.

### 8.6 Share Invite Flow

1. Trip owner opens accepted Trip Plan.
2. Owner generates share invite link.
3. Backend creates `ShareInvite` with token, scope, expiry, and owner metadata.
4. Owner shares link externally.
5. Invited user opens link.
6. If unauthenticated, user is prompted to log in or sign up.
7. Backend validates token.
8. Backend adds user to `TripParticipant` if valid.
9. UI displays trip documents and participant list.

### 8.7 Public Explore Publishing Flow

1. Owner marks accepted Trip Plan as public.
2. Backend verifies required documents exist.
3. Backend computes Explore card metadata:
   - Cover image.
   - Title.
   - Categories.
   - Duration.
   - Estimated budget.
   - Like count.
   - Save count.
4. Trip Plan appears in Explore feed.
5. Other users can open, like, and save it.

## 9. Functional Requirements by Module

### 9.1 Authentication and User Profile

- System must support email/password signup.
- System must normalize emails before uniqueness checks.
- System must hash passwords using a modern password hashing algorithm.
- System must set HTTP-only session cookies after login/signup.
- System must store server-side sessions.
- System must support logout by revoking the active session.
- System must expose current user profile.
- Protected APIs must reject unauthenticated requests.
- Auth responses must not expose password hashes, raw session tokens, or internal session hashes.

### 9.2 Explore Feed

- System must show public accepted Trip Plans.
- System must not show private or invite-only Trip Plans in Explore.
- System must support category filter by the four canonical categories.
- System must support cursor or page-based pagination.
- Feed cards must show:
  - Title.
  - Owner display name.
  - Categories.
  - Cover image.
  - Duration.
  - Estimated budget.
  - Like count.
  - Save count.
  - Viewer liked/saved state when authenticated.
- Public visitors may browse public content.
- Like/save/create actions require authentication.

### 9.3 Likes

- Authenticated users can like public Trip Plans.
- Authenticated users can unlike Trip Plans they liked.
- Like operation must be idempotent or return a predictable duplicate response.
- Like counts must reflect persisted likes.
- Like records must be unique per `user_id + trip_plan_id`.

### 9.4 Collections

- Authenticated users can create collections.
- Authenticated users can rename collections.
- Authenticated users can delete their own collections.
- Authenticated users can save Trip Plans to collections.
- Authenticated users can remove Trip Plans from collections.
- Collection items must be unique per `collection_id + trip_plan_id`.
- Save flow must support inline creation of a new collection.

### 9.5 Image Upload and Image Reuse

- Authenticated users can upload 1 to 8 images for trip creation.
- Supported image formats must include JPG and PNG.
- Backend must enforce file size, MIME type, and image decode validation.
- Uploaded image binaries must be stored in GridFS.
- Uploaded image metadata must be stored in a normal MongoDB collection.
- Users can select images from liked/saved Trip Plans where image access is authorized.
- Frontend must not directly access GridFS.

### 9.6 Image Classification

- Classifier uses PyTorch MobileNetV2.
- Classifier outputs only canonical categories.
- Classifier returns confidence scores from 0 to 1.
- Backend stores per-image classification results.
- Backend aggregates image-level results into session-level category recommendations.
- UI must allow user to confirm or manually correct category labels.
- Manual correction must be persisted and used downstream.
- Backend must support mock classifier mode for tests and early development.

### 9.7 Destination Seed and Enrichment

- Destination seed records are curated Indonesian destinations.
- Seed records must cover all four canonical categories.
- Backend maps confirmed categories to matching seed records.
- Backend queries Google Places API for each selected candidate when provider integration is enabled.
- Backend normalizes Places data before sending it to Gemini.
- Backend must support seed-only fallback when Places API fails, times out, is disabled, or is rate-limited.

### 9.8 Gemini Destination Recommendation

- Backend sends only normalized candidate and constraint data to Gemini.
- Gemini must return structured JSON.
- Backend validates Gemini output against schema.
- Backend retries once with a repair prompt when output is invalid.
- Backend uses deterministic fallback if Gemini output remains invalid.
- UI must render validated recommendation data as polished cards, not raw LLM text.

### 9.9 Destination Selection

- User can select one or more recommendation items.
- Selected recommendation items become inputs for AI Trip Planner.
- Backend must verify selected recommendation items belong to the current user's recommendation run.
- User cannot start planner from another user's private recommendation data.

### 9.10 AI Trip Planner Session

- Backend can create a planner session from a trip creation session and selected recommendations.
- User can send messages to the planner.
- Planner can draft and revise structured documents.
- Planner must preserve last valid documents if an AI/tool call fails.
- Planner session must track status, constraints, selected recommendations, latest documents, and message history.
- Planner cannot mutate an accepted Trip Plan in MVP.

### 9.11 Structured Trip Documents

Required documents:

- Trip Memo.
- Full Itinerary.
- Budget Plan.

Rules:

- Documents must be structured JSON, not raw markdown-only content.
- Documents must include schema versions.
- Documents must be validated before persistence.
- Documents must be renderable as polished UI panels.
- Documents must remain readable without the chat transcript.
- The accepted Trip Plan must contain all three document references.

### 9.12 Trip Plan

- TripPlan is created when the user accepts planner output.
- TripPlan status must be `accepted` after finalization.
- TripPlan visibility can be:
  - `private`
  - `invite_only`
  - `public`
- Only public accepted Trip Plans appear in Explore.
- TripPlan stores selected destination snapshot to protect historical display from future seed/provider changes.
- TripPlan stores participant owner record on creation.

### 9.13 Share Invite and Participants

- Owner can generate share invite links.
- Invite tokens must be stored hashed.
- Invite can expire.
- Invite can be revoked.
- Authenticated invited users can join as participants.
- Participant list must show owner and joined viewers.
- Invalid, expired, revoked, and already-used/already-joined states must be explicit.

### 9.14 Health and Readiness

- `/health` must return liveness.
- `/api/health` must return API-prefixed liveness.
- `/ready` must validate dependencies needed for serving production traffic.
- Readiness should check MongoDB connectivity and required runtime configuration.
- Strict provider readiness can be controlled by configuration.

## 10. UX and UI Requirements

### 10.1 General Design Requirements

- Desktop-first polished web app.
- Operational product surface, not landing-page-first.
- Clear navigation between Explore, collections, trip creation, planner, and Trip Plan detail.
- UI must render structured output as product surfaces, not raw chat dumps.
- Cards should be concise and scannable.
- Loading states must explain active work without exposing raw provider internals.
- Error states must provide retry or fallback paths where possible.
- UI must distinguish estimated data from provider-backed data.

### 10.2 Explore Layout

- Explore is a feed/grid of public Trip Plans.
- Filters must be visible and easy to scan.
- Category filters should support:
  - `pantai`
  - `gunung`
  - `air_terjun`
  - `wisata_tradisional`
- Trip cards must include clear like/save affordances.
- Save flow must support selecting an existing collection or creating a new collection inline.

### 10.3 Trip Creation Layout

- User can choose image source:
  - Upload local files.
  - Use liked trip images.
  - Use collection trip images.
- Upload constraints must be visible before upload.
- Classification result must show source images and predicted categories.
- User must be able to manually correct categories before recommendations.

### 10.4 Recommendation Layout

Recommendation cards must show:

- Destination name.
- Category labels.
- Description.
- Opening hours.
- Estimated cost.
- Address or region.
- Image snaps.
- Match reason.
- Warnings or estimation notes.

The recommendation page must make provider fallback visible in a user-safe way, for example by showing that some information is estimated or unavailable.

### 10.5 AI Trip Planner Layout

- Planner appears as an assistant workspace.
- Conversation exists for revision interaction.
- Canonical outputs render as structured panels:
  - Trip Memo.
  - Full Itinerary.
  - Budget Plan.
- User can review all three documents before accepting.
- Accept CTA must not be enabled if any required document is invalid or missing.
- UI must not depend on chat transcript as the only place where important plan data exists.

### 10.6 Shared Trip Plan Layout

Shared trip view displays:

- Trip title.
- Owner.
- Participants.
- Categories.
- Selected destinations.
- Trip Memo.
- Full Itinerary.
- Budget Plan.

Invite flow must show clear invalid, expired, revoked, and already-joined states. Public view must not expose private owner-only debug data or AI raw prompts.

## 11. Domain Model

All collections below are MongoDB collections unless noted otherwise. Binary image data uses GridFS.

### 11.1 `User`

Purpose: represents an authenticated account.

```json
{
  "_id": "usr_...",
  "email": "user@example.com",
  "email_normalized": "user@example.com",
  "password_hash": "...",
  "display_name": "Khalfani",
  "avatar_image_id": "img_...",
  "status": "active",
  "created_at": "2026-05-08T08:00:00+07:00",
  "updated_at": "2026-05-08T08:00:00+07:00"
}
```

Indexes:

- Unique `email_normalized`.
- `status`.

### 11.2 `UserSession`

Purpose: represents a server-side session for cookie authentication.

```json
{
  "_id": "sess_...",
  "user_id": "usr_...",
  "session_hash": "...",
  "expires_at": "2026-05-15T08:00:00+07:00",
  "created_at": "2026-05-08T08:00:00+07:00",
  "revoked_at": null
}
```

Indexes:

- `user_id`.
- TTL or query index on `expires_at`.

### 11.3 `UploadedImage`

Purpose: stores image metadata for GridFS-backed images.

```json
{
  "_id": "img_...",
  "owner_user_id": "usr_...",
  "gridfs_file_id": "ObjectId(...)",
  "source_type": "upload",
  "source_trip_plan_id": null,
  "mime_type": "image/jpeg",
  "size_bytes": 2450000,
  "width": 1600,
  "height": 1200,
  "checksum_sha256": "...",
  "created_at": "2026-05-08T08:00:00+07:00"
}
```

Allowed `source_type` values:

- `upload`
- `liked_trip_plan`
- `collection_trip_plan`
- `destination_snap`

### 11.4 `ImageClassificationResult`

Purpose: stores classifier predictions for images.

```json
{
  "_id": "cls_...",
  "user_id": "usr_...",
  "trip_creation_session_id": "tcs_...",
  "image_id": "img_...",
  "model_name": "mobilenetv2",
  "model_framework": "pytorch",
  "model_version": "2026-05-mvp",
  "preprocessing_version": "224-square-v1",
  "predictions": [
    {
      "category": "pantai",
      "confidence": 0.82
    }
  ],
  "created_at": "2026-05-08T08:00:00+07:00"
}
```

### 11.5 `DestinationSeed`

Purpose: curated Indonesian destination base used before Places API and Gemini.

```json
{
  "_id": "dest_...",
  "name": "Pantai Kuta",
  "region": "Bali",
  "country": "Indonesia",
  "canonical_categories": ["pantai"],
  "description_seed": "Pantai populer di Bali untuk sunset dan aktivitas pesisir.",
  "estimated_cost": {
    "currency": "IDR",
    "min": 0,
    "max": 100000,
    "source": "seed_estimate"
  },
  "average_visit_duration_minutes": 120,
  "google_place_id": "ChIJ...",
  "search_query": "Pantai Kuta Bali Indonesia",
  "fallback_image_ids": [],
  "status": "active",
  "updated_at": "2026-05-08T08:00:00+07:00"
}
```

Rules:

- Seed data must cover all four categories.
- Seed data must be sufficient for demo fallback when Places API is disabled.

### 11.6 `PlaceEnrichment`

Purpose: stores normalized Google Places API data for a destination seed.

```json
{
  "_id": "plc_...",
  "destination_seed_id": "dest_...",
  "provider": "google_places",
  "provider_place_id": "ChIJ...",
  "name": "Pantai Kuta",
  "formatted_address": "Kuta, Badung Regency, Bali, Indonesia",
  "location": {
    "lat": -8.718492,
    "lng": 115.168632
  },
  "rating": 4.5,
  "review_count": 12000,
  "opening_hours": {
    "weekday_text": [],
    "open_now": null
  },
  "photo_refs": [],
  "website": null,
  "phone": null,
  "fetched_at": "2026-05-08T08:00:00+07:00",
  "expires_at": "2026-05-15T08:00:00+07:00"
}
```

### 11.7 `RecommendationRun`

Purpose: tracks a destination recommendation generation.

```json
{
  "_id": "rec_...",
  "user_id": "usr_...",
  "trip_creation_session_id": "tcs_...",
  "confirmed_categories": ["pantai", "air_terjun"],
  "candidate_destination_ids": ["dest_001", "dest_002"],
  "provider": "gemini",
  "provider_model": "gemini-...",
  "status": "completed",
  "fallback_used": false,
  "created_at": "2026-05-08T08:00:00+07:00"
}
```

### 11.8 `RecommendationItem`

Purpose: validated destination card output.

```json
{
  "_id": "reci_...",
  "recommendation_run_id": "rec_...",
  "destination_seed_id": "dest_...",
  "rank": 1,
  "name": "Pantai Kuta",
  "categories": ["pantai"],
  "description": "Deskripsi lengkap untuk UI.",
  "opening_hours": {
    "summary": "Buka 24 jam",
    "source": "google_places",
    "is_estimated": false
  },
  "estimated_cost": {
    "currency": "IDR",
    "min": 0,
    "max": 100000,
    "notes": ["Parkir dan aktivitas opsional bisa berbeda."]
  },
  "location": {
    "address": "Kuta, Bali",
    "lat": -8.718492,
    "lng": 115.168632
  },
  "image_snaps": [
    {
      "image_url": "/api/places/dest_.../photos/0",
      "source": "google_places"
    }
  ],
  "match_reason": "Cocok dengan preferensi pantai dan aktivitas santai.",
  "warnings": []
}
```

### 11.9 `Collection`

Purpose: user-owned grouping of saved Trip Plans.

```json
{
  "_id": "col_...",
  "owner_user_id": "usr_...",
  "name": "Inspirasi Bali",
  "description": "",
  "created_at": "2026-05-08T08:00:00+07:00",
  "updated_at": "2026-05-08T08:00:00+07:00"
}
```

### 11.10 `CollectionItem`

Purpose: Trip Plan saved inside a collection.

```json
{
  "_id": "coli_...",
  "collection_id": "col_...",
  "owner_user_id": "usr_...",
  "trip_plan_id": "trip_...",
  "created_at": "2026-05-08T08:00:00+07:00"
}
```

Unique constraint:

- `collection_id + trip_plan_id`.

### 11.11 `Like`

Purpose: user like on a public Trip Plan.

```json
{
  "_id": "like_...",
  "user_id": "usr_...",
  "trip_plan_id": "trip_...",
  "created_at": "2026-05-08T08:00:00+07:00"
}
```

Unique constraint:

- `user_id + trip_plan_id`.

### 11.12 `TripPlannerSession`

Purpose: stores planner interaction state before final Trip Plan acceptance.

```json
{
  "_id": "plan_sess_...",
  "user_id": "usr_...",
  "confirmed_categories": ["pantai"],
  "selected_recommendation_item_ids": ["reci_..."],
  "constraints": {
    "days": 3,
    "budget_total": 3000000,
    "currency": "IDR",
    "group_size": 2,
    "transportation": "car",
    "pace": "normal"
  },
  "status": "active",
  "created_at": "2026-05-08T08:00:00+07:00",
  "updated_at": "2026-05-08T08:00:00+07:00"
}
```

### 11.13 `TripMemoDocument`

Purpose: structured planning memo.

```json
{
  "_id": "memo_...",
  "planner_session_id": "plan_sess_...",
  "trip_plan_id": null,
  "schema_version": "trip_memo.v1",
  "content": {
    "title": "Trip Bali Pantai 3 Hari",
    "destination_context": "Fokus pantai dan aktivitas santai di Bali.",
    "preferences": ["pantai", "sunset", "kuliner lokal"],
    "constraints": {
      "days": 3,
      "budget_total": 3000000,
      "group_size": 2
    },
    "selected_destinations": [],
    "planning_notes": []
  },
  "source": {
    "type": "gemini_agent",
    "model": "gemini-..."
  },
  "created_at": "2026-05-08T08:00:00+07:00",
  "updated_at": "2026-05-08T08:00:00+07:00"
}
```

Required content shape:

- `title`
- `destination_context`
- `preferences`
- `constraints`
- `selected_destinations`
- `planning_notes`

### 11.14 `FullItineraryDocument`

Purpose: structured day-by-day itinerary.

```json
{
  "_id": "itin_doc_...",
  "planner_session_id": "plan_sess_...",
  "trip_plan_id": null,
  "schema_version": "full_itinerary.v1",
  "content": {
    "title": "Itinerary Bali 3 Hari",
    "days": [
      {
        "day_number": 1,
        "date": null,
        "theme": "Pantai dan sunset",
        "schedule_items": [
          {
            "start_time": "09:00",
            "end_time": "11:00",
            "title": "Kunjungan ke Pantai Kuta",
            "place_name": "Pantai Kuta",
            "destination_seed_id": "dest_...",
            "estimated_duration_minutes": 120,
            "transport_note": "Berangkat dari hotel dengan mobil.",
            "cost_estimate": {
              "currency": "IDR",
              "amount": 50000
            },
            "notes": []
          }
        ],
        "alternatives": []
      }
    ]
  },
  "created_at": "2026-05-08T08:00:00+07:00",
  "updated_at": "2026-05-08T08:00:00+07:00"
}
```

Required content shape:

- `title`
- `days`
- `days[].day_number`
- `days[].schedule_items`
- `days[].alternatives`

### 11.15 `BudgetPlanDocument`

Purpose: structured cost plan.

```json
{
  "_id": "budget_doc_...",
  "planner_session_id": "plan_sess_...",
  "trip_plan_id": null,
  "schema_version": "budget_plan.v1",
  "content": {
    "currency": "IDR",
    "group_size": 2,
    "total_estimate": 3000000,
    "per_person_estimate": 1500000,
    "categories": [
      {
        "name": "transportation",
        "total": 900000,
        "line_items": [
          {
            "label": "Sewa mobil",
            "amount": 600000,
            "quantity": 1,
            "notes": []
          }
        ]
      }
    ],
    "confidence": "medium",
    "assumptions": ["Harga dapat berubah sesuai musim dan ketersediaan."]
  },
  "created_at": "2026-05-08T08:00:00+07:00",
  "updated_at": "2026-05-08T08:00:00+07:00"
}
```

Required content shape:

- `currency`
- `group_size`
- `total_estimate`
- `per_person_estimate`
- `categories`
- `confidence`
- `assumptions`

### 11.16 `TripPlan`

Purpose: accepted trip plan that can be private, invite-only, or public in Explore.

```json
{
  "_id": "trip_...",
  "owner_user_id": "usr_...",
  "planner_session_id": "plan_sess_...",
  "title": "Trip Bali Pantai 3 Hari",
  "status": "accepted",
  "visibility": "private",
  "categories": ["pantai"],
  "cover_image_id": "img_...",
  "memo_document_id": "memo_...",
  "full_itinerary_document_id": "itin_doc_...",
  "budget_plan_document_id": "budget_doc_...",
  "selected_destination_snapshot": [],
  "duration_days": 3,
  "estimated_budget_total": 3000000,
  "published_at": null,
  "created_at": "2026-05-08T08:00:00+07:00",
  "updated_at": "2026-05-08T08:00:00+07:00"
}
```

### 11.17 `TripParticipant`

Purpose: records users with access to a Trip Plan.

```json
{
  "_id": "part_...",
  "trip_plan_id": "trip_...",
  "user_id": "usr_...",
  "role": "viewer",
  "joined_via_invite_id": "inv_...",
  "joined_at": "2026-05-08T08:00:00+07:00"
}
```

Unique constraint:

- `trip_plan_id + user_id`.

### 11.18 `ShareInvite`

Purpose: invite token for shared Trip Plan access.

```json
{
  "_id": "inv_...",
  "trip_plan_id": "trip_...",
  "created_by_user_id": "usr_...",
  "token_hash": "...",
  "status": "active",
  "scope": "viewer",
  "expires_at": "2026-06-08T08:00:00+07:00",
  "created_at": "2026-05-08T08:00:00+07:00",
  "revoked_at": null
}
```

### 11.19 `AuditLog`

Purpose: optional operational log for sensitive events.

Events:

- Login failure.
- Share invite created.
- Share invite revoked.
- Trip visibility changed.
- Provider fallback used.
- AI output validation failed.

## 12. API and Data Contracts

### 12.1 API Conventions

Base API:

- Production: `https://api.snaptrip.site/api`
- Local development: `http://127.0.0.1:8000/api`

Success response envelope:

```json
{
  "data": {},
  "meta": {
    "request_id": "req_...",
    "fallback_used": false
  }
}
```

Error response envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request is invalid.",
    "details": {}
  },
  "meta": {
    "request_id": "req_..."
  }
}
```

Rules:

- All timestamps use ISO 8601 with timezone.
- Backend stores canonical timestamps in UTC or timezone-aware format and renders Asia/Jakarta where required by UI.
- All mutation endpoints require CSRF protection when cookie auth is used.
- Provider secrets must never appear in API responses.
- AI raw prompts and raw provider responses must not be returned to regular frontend routes.

### 12.2 Endpoint Summary

| Method | Path | Purpose | Auth |
| --- | --- | --- | --- |
| `POST` | `/api/auth/signup` | Create user account and authenticated session | Public |
| `POST` | `/api/auth/login` | Authenticate user and set session cookie | Public |
| `POST` | `/api/auth/logout` | Revoke current session | Required |
| `GET` | `/api/auth/me` | Return current authenticated profile | Required |
| `GET` | `/api/explore/trip-plans` | List public Trip Plans | Optional |
| `GET` | `/api/trip-plans/{trip_plan_id}` | Return Trip Plan detail if authorized | Optional/Required by visibility |
| `POST` | `/api/trip-plans/{trip_plan_id}/like` | Like Trip Plan | Required |
| `DELETE` | `/api/trip-plans/{trip_plan_id}/like` | Unlike Trip Plan | Required |
| `GET` | `/api/collections` | List current user's collections | Required |
| `POST` | `/api/collections` | Create collection | Required |
| `PATCH` | `/api/collections/{collection_id}` | Rename collection | Required |
| `DELETE` | `/api/collections/{collection_id}` | Delete collection | Required |
| `POST` | `/api/collections/{collection_id}/items` | Save Trip Plan to collection | Required |
| `DELETE` | `/api/collections/{collection_id}/items/{trip_plan_id}` | Remove Trip Plan from collection | Required |
| `POST` | `/api/trip-creation-sessions` | Create trip creation session | Required |
| `POST` | `/api/trip-creation-sessions/{session_id}/images` | Upload images for classification | Required |
| `POST` | `/api/trip-creation-sessions/{session_id}/image-references` | Add reusable image references | Required |
| `GET` | `/api/images/{image_id}` | Controlled image stream | Optional/Required by image visibility |
| `POST` | `/api/trip-creation-sessions/{session_id}/classify` | Run classifier | Required |
| `POST` | `/api/trip-creation-sessions/{session_id}/categories/confirm` | Persist confirmed categories | Required |
| `GET` | `/api/categories` | Return canonical categories | Public |
| `POST` | `/api/trip-creation-sessions/{session_id}/recommendations` | Generate recommendations | Required |
| `GET` | `/api/recommendation-runs/{recommendation_run_id}` | Fetch recommendation run | Required |
| `GET` | `/api/places/{destination_seed_id}` | Return normalized place detail | Optional |
| `POST` | `/api/planner-sessions` | Create planner session | Required |
| `POST` | `/api/planner-sessions/{planner_session_id}/messages` | Send planner message | Required |
| `GET` | `/api/planner-sessions/{planner_session_id}` | Fetch planner state | Required |
| `GET` | `/api/planner-sessions/{planner_session_id}/documents` | Fetch latest structured documents | Required |
| `PATCH` | `/api/planner-sessions/{planner_session_id}/documents/{document_type}` | Apply structured document update | Required |
| `POST` | `/api/planner-sessions/{planner_session_id}/accept` | Accept documents and create TripPlan | Required |
| `PATCH` | `/api/trip-plans/{trip_plan_id}/visibility` | Change TripPlan visibility | Owner |
| `POST` | `/api/trip-plans/{trip_plan_id}/invites` | Create share invite | Owner |
| `GET` | `/api/invites/{token}` | Preview invite status | Public |
| `POST` | `/api/invites/{token}/join` | Join Trip Plan as participant | Required |
| `DELETE` | `/api/trip-plans/{trip_plan_id}/invites/{invite_id}` | Revoke invite | Owner |
| `GET` | `/health` | Liveness | Public |
| `GET` | `/api/health` | API-prefixed liveness | Public |
| `GET` | `/ready` | Deployment readiness | Public/Operational |

### 12.3 Auth Contracts

`POST /api/auth/signup`

```json
{
  "email": "user@example.com",
  "password": "minimum-12-chars",
  "display_name": "Khalfani"
}
```

Response:

```json
{
  "data": {
    "user": {
      "user_id": "usr_...",
      "email": "user@example.com",
      "display_name": "Khalfani"
    }
  },
  "meta": {
    "fallback_used": false
  }
}
```

`POST /api/auth/login`

```json
{
  "email": "user@example.com",
  "password": "minimum-12-chars"
}
```

### 12.4 Explore Contract

`GET /api/explore/trip-plans`

Query parameters:

- `category=pantai`
- `cursor=...`
- `limit=20`

Response:

```json
{
  "data": {
    "items": [
      {
        "trip_plan_id": "trip_...",
        "title": "Trip Bali Pantai 3 Hari",
        "owner": {
          "display_name": "Khalfani"
        },
        "categories": ["pantai"],
        "cover_image_url": "https://api.snaptrip.site/api/images/img_...",
        "duration_days": 3,
        "estimated_budget_total": 3000000,
        "like_count": 12,
        "save_count": 5,
        "viewer_state": {
          "liked": false,
          "saved": true
        }
      }
    ],
    "next_cursor": null
  }
}
```

### 12.5 Trip Creation and Classification Contracts

`POST /api/trip-creation-sessions`

```json
{
  "data": {
    "trip_creation_session_id": "tcs_...",
    "status": "active"
  }
}
```

`POST /api/trip-creation-sessions/{session_id}/images`

- Request type: `multipart/form-data`
- Field: `images: File[]`

`POST /api/trip-creation-sessions/{session_id}/image-references`

```json
{
  "source_image_ids": ["img_..."]
}
```

`POST /api/trip-creation-sessions/{session_id}/classify`

```json
{
  "data": {
    "trip_creation_session_id": "tcs_...",
    "image_results": [
      {
        "image_id": "img_...",
        "predictions": [
          {
            "category": "pantai",
            "confidence": 0.82
          }
        ]
      }
    ],
    "aggregated_categories": [
      {
        "category": "pantai",
        "confidence": 0.78
      }
    ],
    "model": {
      "name": "mobilenetv2",
      "framework": "pytorch",
      "version": "2026-05-mvp"
    }
  }
}
```

`POST /api/trip-creation-sessions/{session_id}/categories/confirm`

```json
{
  "categories": ["pantai", "air_terjun"],
  "source": "manual_correction"
}
```

### 12.6 Category Contract

`GET /api/categories`

```json
{
  "data": {
    "categories": [
      {
        "id": "pantai",
        "label": "Pantai"
      },
      {
        "id": "gunung",
        "label": "Gunung"
      },
      {
        "id": "air_terjun",
        "label": "Air Terjun"
      },
      {
        "id": "wisata_tradisional",
        "label": "Wisata Tradisional"
      }
    ]
  }
}
```

### 12.7 Recommendation Contract

`POST /api/trip-creation-sessions/{session_id}/recommendations`

Request:

```json
{
  "constraints": {
    "region_preference": "Bali",
    "budget_total": 3000000,
    "days": 3,
    "group_size": 2
  }
}
```

Response:

```json
{
  "data": {
    "recommendation_run_id": "rec_...",
    "items": [
      {
        "recommendation_item_id": "reci_...",
        "destination_seed_id": "dest_...",
        "rank": 1,
        "name": "Pantai Kuta",
        "categories": ["pantai"],
        "description": "Deskripsi lengkap tujuan wisata.",
        "opening_hours": {
          "summary": "Buka 24 jam",
          "source": "google_places",
          "is_estimated": false
        },
        "estimated_cost": {
          "currency": "IDR",
          "min": 0,
          "max": 100000,
          "notes": []
        },
        "location": {
          "address": "Kuta, Bali",
          "lat": -8.718492,
          "lng": 115.168632
        },
        "image_snaps": [],
        "match_reason": "Cocok dengan preferensi pantai."
      }
    ]
  },
  "meta": {
    "fallback_used": false
  }
}
```

### 12.8 Planner Contracts

`POST /api/planner-sessions`

```json
{
  "trip_creation_session_id": "tcs_...",
  "selected_recommendation_item_ids": ["reci_..."],
  "constraints": {
    "days": 3,
    "budget_total": 3000000,
    "currency": "IDR",
    "group_size": 2,
    "transportation": "car",
    "pace": "normal",
    "special_notes": "Jangan terlalu padat."
  }
}
```

`POST /api/planner-sessions/{planner_session_id}/messages`

```json
{
  "message": "Buat itinerary lebih santai dan sisakan waktu sunset."
}
```

Response:

```json
{
  "data": {
    "planner_session_id": "plan_sess_...",
    "assistant_message": "Rencana sudah diperbarui.",
    "documents": {
      "trip_memo": {},
      "full_itinerary": {},
      "budget_plan": {}
    }
  },
  "meta": {
    "fallback_used": false
  }
}
```

Document type values:

- `trip_memo`
- `full_itinerary`
- `budget_plan`

### 12.9 Trip Acceptance and Share Contracts

`POST /api/planner-sessions/{planner_session_id}/accept`

```json
{
  "visibility": "private",
  "title": "Trip Bali Pantai 3 Hari"
}
```

Response:

```json
{
  "data": {
    "trip_plan_id": "trip_...",
    "status": "accepted",
    "visibility": "private"
  }
}
```

`PATCH /api/trip-plans/{trip_plan_id}/visibility`

- Allowed values: `private`, `invite_only`, `public`.

`POST /api/trip-plans/{trip_plan_id}/invites`

```json
{
  "data": {
    "invite_id": "inv_...",
    "invite_url": "https://snaptrip.site/invite/st_...",
    "expires_at": "2026-06-08T08:00:00+07:00"
  }
}
```

## 13. AI and Provider Requirements

### 13.1 Image Classifier

| Property | Requirement |
| --- | --- |
| Framework | PyTorch |
| Architecture | MobileNetV2 |
| Input count | 1 to 8 images |
| Input preprocessing | Resize/crop to expected model input, expected `224 x 224` |
| Output labels | `pantai`, `gunung`, `air_terjun`, `wisata_tradisional` |
| Output confidence | Number between 0 and 1 |
| Test mode | Mock classifier mode required |

Output:

```json
{
  "predictions": [
    {
      "category": "pantai",
      "confidence": 0.82
    }
  ]
}
```

Rules:

- Classifier categories must exactly match canonical category IDs.
- Confidence values must be between 0 and 1.
- Backend must include model version in persisted results.
- Backend must support mock classifier mode for tests and early local development.
- Backend must provide manual category fallback.

### 13.2 Category Aggregation

- Aggregate image-level predictions into session-level category confidence.
- Multiple images can produce multiple top categories.
- UI can show confidence, but user confirmation is the canonical category selection.
- Manual confirmation overrides model confidence for downstream recommendation.

### 13.3 Places API Integration

Provider: Google Maps Places API.

Use:

- Place details.
- Address.
- Coordinates.
- Rating.
- Review count.
- Opening hours.
- Photo references.
- Website/phone when available.

Rules:

- Backend only.
- API key never reaches frontend.
- Use per-request timeout.
- Partial provider failure must not fail the whole recommendation run.
- Cache or persist normalized enrichment with expiry.
- Use destination seed fallback when Places API is disabled, unavailable, or rate-limited.

### 13.4 Gemini Recommendation Generation

Purpose: turn normalized candidate places into user-facing structured destination cards.

Gemini input must include:

- Confirmed categories.
- Candidate place data.
- Seed fallback data.
- User constraints.
- Output schema instructions.
- Rule to avoid unsupported claims.

Gemini output must include:

- Ordered destination cards.
- Descriptions.
- Opening hours.
- Estimated cost.
- Image snaps.
- Match reasons.
- Notes and warnings.

Rules:

- Gemini output must parse as JSON.
- Backend validates against schema.
- Backend retries once with a repair prompt if output is invalid.
- If still invalid, backend uses deterministic fallback from seed plus Places data.
- UI renders only validated data.

### 13.5 Agentic Planner

Provider: Gemini.

Planner responsibilities:

- Draft Trip Memo.
- Draft Full Itinerary.
- Draft Budget Plan.
- Revise documents based on user conversation.
- Use selected destination data and user constraints.
- Research relevant web information when tool is enabled.
- Preserve uncertainty and source notes for volatile data.

Allowed tools:

- `web_research(query, context)` for targeted trip information.
- `read_trip_memo(planner_session_id)`.
- `read_full_itinerary(planner_session_id)`.
- `read_budget_plan(planner_session_id)`.
- `update_trip_memo(planner_session_id, structured_content)`.
- `update_full_itinerary(planner_session_id, structured_content)`.
- `update_budget_plan(planner_session_id, structured_content)`.

Rules:

- Tool calls are backend-mediated.
- Tool output must be validated before state mutation.
- Planner cannot mutate TripPlan after acceptance in MVP.
- Planner must not invent prices or opening hours as facts; estimates must be labeled.
- Planner must preserve last valid documents if a revision fails.

## 14. Technical Architecture

### 14.1 Runtime Topology

Hosted production runs on one VM:

```text
Caddy -> Next.js web
Caddy -> FastAPI API
FastAPI -> MongoDB
FastAPI -> GridFS
FastAPI -> PyTorch classifier
FastAPI -> Google Places API
FastAPI -> Gemini
```

Docker Compose services:

- `caddy`
- `mongo`
- `api`
- `web`

Local development may also include optional test/support containers.

### 14.2 Frontend Stack

Required:

- Next.js App Router.
- Node.js.
- TypeScript.
- React.
- Vitest for unit tests.
- Playwright for E2E tests.

Frontend rules:

- Use `NEXT_PUBLIC_API_BASE_URL` for backend URL.
- Never call provider APIs directly.
- Keep API response schemas validated at runtime for important flows.
- Keep polished UI states for AI loading, provider fallback, validation failure, and access denial.

### 14.3 Backend Stack

Required:

- Python.
- FastAPI.
- `uv`.
- Pydantic for request/response schemas.
- Motor or PyMongo for MongoDB access.
- GridFS integration.
- PyTorch and torchvision for MobileNetV2 inference.
- httpx for outbound provider calls.
- pytest, pytest-asyncio, httpx, and testcontainers for tests.

Backend rules:

- API routes call service-layer functions.
- Provider clients are isolated behind service adapters.
- MongoDB indexes are created by startup task or migration-like script.
- AI output validation happens before persistence.
- Configuration uses environment variables loaded through settings.

### 14.4 Database

Canonical database: self-hosted MongoDB.

Image storage: MongoDB GridFS.

Rules:

- MongoDB is internal-only in production Compose.
- Persistent MongoDB data lives under VM shared storage.
- GridFS bucket name is configured through environment variable.
- Tests use testcontainers MongoDB for integration coverage.

### 14.5 Root Package Orchestration

The repo root must include `package.json` as the developer entrypoint.

Required root commands:

- `npm install`
- `npm run test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

Expected behavior:

- `npm install` installs root tooling, frontend dependencies, and prepares backend `uv` environment.
- `npm run test` runs backend pytest, frontend Vitest, and Playwright e2e where configured.
- `npm run typecheck` runs frontend TypeScript and backend static validation where configured.
- `npm run lint` runs frontend lint and backend lint/format check where configured.
- `npm run build` runs frontend build and backend/container build validation.
- Root scripts must make routine development possible without requiring developers to remember separate frontend/backend commands.
- Root npm scripts must explicitly call `uv` for backend install, test, lint/typecheck, dev, and build-validation tasks.
- Developers should be able to stay at repo root for normal workflows; direct `cd app/backend && uv ...` usage is allowed for debugging but must not be required for standard install/test/lint/typecheck/build.

Required root `package.json` script shape:

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

The exact lint/typecheck tools may be adjusted during implementation, but the root script names and the backend-through-`uv` orchestration contract must remain.

## 15. Repository Layout Requirements

Expected layout:

```text
.
|-- .agents/
|   |-- PRD.md
|   |-- implementationPhase.md
|   `-- rules.md
|-- .github/
|   `-- workflows/
|-- app/
|   |-- backend/
|   |   |-- app/
|   |   |-- tests/
|   |   |-- pyproject.toml
|   |   `-- uv.lock
|   `-- frontend/
|       |-- app/
|       |-- components/
|       |-- lib/
|       `-- tests/
|-- deploy/
|   |-- caddy/
|   |   `-- Caddyfile
|   |-- compose/
|   |   `-- docker-compose.remote.yml
|   |-- env/
|   |   `-- runtime.production.env.example
|   `-- scripts/
|       |-- assert-ready.sh
|       |-- bootstrap-vm.sh
|       |-- remote-deploy.sh
|       |-- remote-preflight.sh
|       |-- remote-rollback.sh
|       `-- smoke-check.sh
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

Rules:

- Root `docker-compose.yml` is local development only.
- Remote production compose must live at `deploy/compose/docker-compose.remote.yml`.
- Deployment scripts must be implemented explicitly for SnapTrip:
  - `deploy/scripts/bootstrap-vm.sh` prepares `/opt/snaptrip/hosted`, shared directories, Docker, and Caddy prerequisites.
  - `deploy/scripts/remote-preflight.sh` validates VM tools, required directories, runtime env presence, Docker Compose availability, and safe permissions.
  - `deploy/scripts/remote-deploy.sh` unpacks a source archive into `/opt/snaptrip/hosted/releases/<sha>`, updates `current`, runs remote compose, and records `current_release`.
  - `deploy/scripts/remote-rollback.sh` switches `current` back to the previous valid release and restarts the remote compose stack.
  - `deploy/scripts/assert-ready.sh` checks `https://api.snaptrip.site/ready` and fails with actionable output when readiness is invalid.
  - `deploy/scripts/smoke-check.sh` checks `https://snaptrip.site`, `https://api.snaptrip.site/health`, and `https://api.snaptrip.site/ready`.
- Do not keep production compose only under `infra/docker`.
- Do not require direct manual `uv` or frontend npm commands for common root workflows.
- `training/` is for ML model training assets only and is unrelated to hosted application runtime.
- `docs/adr/` is for Architecture Decision Records following `.agents/rules.md`.

## 16. Environment Variables

### 16.1 Backend Runtime

Required:

```dotenv
APP_NAME=SnapTrip API
APP_ENV=production
API_BASE_URL=https://api.snaptrip.site
WEB_BASE_URL=https://snaptrip.site
CORS_ORIGINS=https://snaptrip.site
SESSION_SECRET=
COOKIE_SECURE=true
MONGODB_URI=
MONGODB_DATABASE=snaptrip
GRIDFS_BUCKET=snaptrip_images
CLASSIFIER_MODEL_PATH=/app/models/snaptrip_mobilenetv2.pt
CLASSIFIER_MODEL_VERSION=2026-05-mvp
GEMINI_API_KEY=
GEMINI_MODEL=
GOOGLE_PLACES_API_KEY=
USE_GOOGLE_PLACES=true
USE_GEMINI=true
```

Optional:

```dotenv
AI_PROVIDER_TIMEOUT_SECONDS=30
PLACES_CACHE_TTL_SECONDS=604800
MAX_UPLOAD_IMAGE_BYTES=8388608
MAX_UPLOAD_IMAGES=8
STRICT_READINESS=false
```

### 16.2 Frontend Runtime and Build

Required:

```dotenv
NEXT_PUBLIC_API_BASE_URL=https://api.snaptrip.site
```

### 16.3 Remote Deployment

Required hosted secrets:

- VM SSH host.
- VM SSH user.
- VM SSH private key.
- VM SSH known hosts.
- VM SSH port.
- Caddy email.
- Web domain.
- API domain.
- MongoDB root username.
- MongoDB root password.
- MongoDB database.
- MongoDB replica key if replica set is used.
- Session secret.
- Gemini API key.
- Gemini model.
- Google Places API key.

## 17. Security and Privacy Requirements

### 17.1 Auth Security

- Store password hashes using a modern password hashing algorithm.
- Use HTTP-only secure cookies in production.
- Use SameSite cookie policy compatible with same-site web/API deployment.
- Rate-limit login attempts.
- Return generic auth failure messages.
- Revoke sessions on logout.

### 17.2 Access Control

- Only owner can modify a private Trip Plan.
- Public Trip Plans are read-only to non-owners.
- Invite-only Trip Plans require valid participant membership or active invite join.
- Collection access is owner-only.
- Uploaded images are owner-only unless attached to public Trip Plan display.

### 17.3 Provider Secrets

- Gemini and Google Places API keys are backend-only.
- Provider keys must never be exposed to the frontend bundle.
- Logs must not include provider secrets, session secrets, raw cookies, or password data.

### 17.4 AI Safety and Correctness

- Treat all LLM output as untrusted.
- Validate structured output before persistence.
- Clearly label estimates and uncertainty.
- Do not present estimated cost or opening hours as guaranteed facts.
- Keep raw prompt/provider output out of public Trip Plan responses.

### 17.5 Image Privacy

- Uploaded images belong to the user.
- Uploaded image binary data is stored in GridFS.
- Image URLs must be controlled by backend authorization rules.
- Do not use user-uploaded images for classifier training without explicit future consent flow.

## 18. Non-Functional Requirements

### 18.1 Reliability

- API must remain usable when Gemini is unavailable for non-AI browsing flows.
- Recommendation flow must fallback to deterministic seed/Places data when Gemini fails.
- Planner must preserve last valid structured documents when a revision fails.
- Deployment must support rollback to previous release.

### 18.2 Performance

- Explore initial response should return within 1 second under normal local VM load.
- Image upload should reject oversized files before expensive classifier inference.
- Classifier batch inference should process MVP upload batch within acceptable user-facing loading time.
- Places API calls should use concurrency limits and timeouts.
- Gemini calls should use timeouts and session-level rate limits.

### 18.3 Maintainability

- Backend provider clients must be isolated behind interfaces/services.
- AI schemas must be versioned.
- Trip document schemas must be versioned.
- Root scripts must remain the supported command interface.
- Tests should mock provider calls by default and use real provider calls only in explicitly configured manual tests.

### 18.4 Observability

- Log request ID, endpoint, status, duration, and fallback usage.
- Log provider call status and latency without secrets.
- Log AI validation failures with schema version and reason.
- `/ready` must explain failed dependency in safe operational terms.

### 18.5 Backup and Recovery

- MongoDB/GridFS persistent data must live in VM shared storage.
- Deploy and rollback must never delete MongoDB shared data.
- Backups are recommended before major data migrations.
- Rollback changes code/runtime only and does not reverse database mutations.

## 19. Deployment Topology

### 19.1 Domains

- Web frontend: `https://snaptrip.site`
- Backend API: `https://api.snaptrip.site`

### 19.2 Hosting

Hosted environment runs on one VM.

Docker Compose manages:

- `caddy`
- `mongo`
- `api`
- `web`

MongoDB runs as a single self-hosted MongoDB service inside Docker Compose. API and web are released together from the same git SHA. Images and MongoDB data persist across releases through shared volumes/directories.

### 19.3 VM Paths

Use release layout:

```text
/opt/snaptrip/hosted/releases/<sha>
/opt/snaptrip/hosted/current
/opt/snaptrip/hosted/current_release
/opt/snaptrip/hosted/shared/runtime.env
/opt/snaptrip/hosted/shared/mongo-data
/opt/snaptrip/hosted/shared/caddy-data
/opt/snaptrip/hosted/shared/caddy-config
```

Requirements:

- Persistent data lives under `/opt/snaptrip/hosted/shared`.
- Release directories are immutable per SHA.
- Keep latest five release directories.
- Never delete `shared/mongo-data` during deploy or rollback.
- Never delete Caddy data/config during deploy or rollback.

### 19.4 Reverse Proxy

Caddy must:

- Terminate TLS.
- Route `snaptrip.site` to `web`.
- Route `api.snaptrip.site` to `api`.
- Expose only required public ports.
- Keep MongoDB internal only.
- Apply secure response headers.
- Use gzip/zstd encoding where supported.

## 20. Local Docker Compose Requirements

Root `docker-compose.yml` is local development only.

Local compose should include:

- MongoDB.
- API service or API dependencies as the implementation matures.
- Web service or web dependencies as the implementation matures.

Rules:

- Local compose must not be used as the production deploy file.
- Local compose can expose MongoDB to localhost for developer tooling.
- Remote compose must keep MongoDB internal.
- Local compose should be runnable from repo root.

## 21. CI/CD Requirements

### 21.1 CI Gate

CI/CD is scoped to the `main` branch and pull requests targeting `main`.

CI runs when hosted-runtime relevant paths change:

- `app/backend/**`
- `app/frontend/**`
- `tests/**`
- `deploy/**`
- `docker-compose.yml`
- `package.json`
- package lockfiles
- backend dependency files under `app/backend/`
- GitHub workflow files

Validation steps:

1. `npm install` or `npm ci` depending on lockfile policy.
2. Install Playwright browser dependencies when E2E tests are enabled.
3. `npm run lint`
4. `npm run typecheck`
5. `npm run test`
6. `npm run build`
7. `docker compose config`
8. `docker compose build`
9. `docker compose -f deploy/compose/docker-compose.remote.yml config`
10. `docker compose -f deploy/compose/docker-compose.remote.yml build`

Security steps:

- Gitleaks secret scan may be included.
- Trivy is explicitly not required.
- CodeQL is explicitly not required.

### 21.2 Path Filters

Hosted CI/CD and production deploy should not trigger for docs-only and non-runtime changes:

- `.agents/**`
- `docs/**`
- `training/**`
- `drafts/**`
- `examples/**`
- `*.md`

CI may still run lightweight documentation checks if configured, but production deploy must not run for documentation-only, ADR-only, agent-document-only, or ML-training-only changes.

### 21.3 Deploy Hosted Environment

Deploy triggers:

- After successful CI on push to `main`.
- Manual dispatch by git ref.

Deploy flow:

1. Checkout target ref.
2. Resolve `RELEASE_SHA`.
3. Validate required runtime secrets.
4. Connect to VM through SSH with pinned known hosts.
5. Create remote release directory.
6. Capture previous release SHA.
7. Upload source release archive generated from git SHA.
8. Render and upload `/opt/snaptrip/hosted/shared/runtime.env`.
9. Run remote preflight script.
10. Run remote deploy script.
11. Run smoke checks.
12. Validate `/ready` semantically.
13. Roll back to previous release if post-deploy validation fails.

### 21.4 VM Deploy Mechanism

- Deploy scripts operate under `/opt/snaptrip/hosted`.
- Each release is unpacked into `/opt/snaptrip/hosted/releases/<sha>`.
- `current` symlink points to the active release.
- `current_release` records the active SHA.
- Runtime env lives in shared storage, not inside immutable release directories.
- Production compose is executed from the active release.

### 21.5 Rollback

Rollback must:

- Read previous release SHA.
- Point `current` back to the previous release.
- Restart remote compose.
- Validate health/readiness.
- Preserve MongoDB/GridFS data.
- Preserve Caddy data/config.

Rollback must not:

- Delete shared MongoDB data.
- Delete GridFS data.
- Delete Caddy certificates.
- Rewrite historical Trip Plan documents.

### 21.6 Remote Compose Requirements

Remote compose must include:

- `caddy` service with mounted Caddyfile and persistent Caddy data.
- `mongo` service with persistent data under shared storage.
- `api` service built from backend Dockerfile.
- `web` service built from frontend Dockerfile.
- Healthchecks for MongoDB, API, web, and Caddy.
- Internal network for service communication.
- Public ports only on Caddy.

## 22. Acceptance Criteria

### 22.1 Auth and Profile

- User can sign up with valid email/password/display name.
- Duplicate email signup is rejected.
- User can log in and receives session cookie.
- User can fetch current profile.
- User can log out and session is revoked.
- Protected endpoints reject unauthenticated requests.

### 22.2 Explore, Likes, and Collections

- Public visitor can browse Explore.
- Public visitor can filter by each canonical category.
- Public visitor can open public Trip Plan detail.
- Unauthenticated like/save/create attempts prompt login or return `401`.
- Authenticated user can like and unlike public Trip Plan.
- Authenticated user can create collection.
- Authenticated user can save Trip Plan to collection.
- Authenticated user can remove Trip Plan from collection.
- Private Trip Plans never appear in Explore.

### 22.3 Image Classification

- User can upload valid images.
- Invalid file type is rejected.
- Oversized file is rejected.
- Uploaded binary is stored in GridFS.
- Classifier returns only canonical categories.
- Aggregated category result is shown to user.
- User can manually correct categories.
- Classifier failure allows manual category fallback.

### 22.4 Recommendations

- Backend maps confirmed categories to destination seeds.
- Backend queries Places API per candidate when enabled.
- Places API failure for one candidate does not fail all recommendations.
- Gemini receives normalized candidate data.
- Gemini structured output is validated.
- Invalid Gemini output is retried or falls back deterministically.
- UI receives structured destination cards.
- Destination cards include description, opening hours, estimated cost, and image snaps when available.

### 22.5 Planner and Documents

- User can create planner session from selected destinations.
- User can send planner message.
- Agent can draft Trip Memo.
- Agent can draft Full Itinerary.
- Agent can draft Budget Plan.
- User can request revisions.
- Invalid AI revision preserves last valid document state.
- Accept button is disabled when required documents are missing or invalid.
- Accepted Trip Plan stores all three structured documents.

### 22.6 Sharing and Participants

- Owner can generate share invite.
- Invite link opens preview/join flow.
- Expired invite is rejected.
- Revoked invite is rejected.
- Authenticated invited user can join as participant.
- Participant list displays owner and joined viewers.
- Invite-only/private access rules are enforced.

### 22.7 Deployment

- Root install/test/typecheck/lint/build scripts work.
- Local `docker-compose.yml` validates.
- Remote `deploy/compose/docker-compose.remote.yml` validates.
- CI excludes Trivy and CodeQL.
- Deploy uploads source archive to VM.
- VM builds and starts Docker Compose stack.
- `/ready` is validated after deploy.
- Failed readiness triggers rollback to previous release if available.
- Deploy and rollback preserve MongoDB/GridFS data.

## 23. Test Scenarios

Implementation must cover at minimum:

1. Signup success.
2. Signup duplicate email.
3. Login success.
4. Login invalid password.
5. Logout revokes session.
6. Current profile requires valid session.
7. Explore list returns only public accepted Trip Plans.
8. Explore category filter for `pantai`.
9. Explore category filter for `gunung`.
10. Explore category filter for `air_terjun`.
11. Explore category filter for `wisata_tradisional`.
12. Public Trip Plan detail loads.
13. Private Trip Plan detail rejects non-owner.
14. Like creates one like.
15. Repeated like is idempotent.
16. Unlike removes like.
17. Create collection.
18. Rename collection.
19. Save Trip Plan to collection.
20. Duplicate collection item is idempotent or rejected predictably.
21. Remove Trip Plan from collection.
22. Upload valid JPG to GridFS.
23. Upload valid PNG to GridFS.
24. Reject invalid file type.
25. Reject oversized image.
26. Classifier returns canonical category predictions.
27. Classifier aggregates multiple image predictions.
28. Manual category correction persists.
29. Classifier failure enables manual fallback.
30. Destination seed query by category.
31. Places API normalization with mocked httpx response.
32. Places API timeout uses seed fallback.
33. Gemini recommendation valid JSON persists `RecommendationRun`.
34. Gemini recommendation invalid JSON triggers retry.
35. Gemini recommendation second invalid output uses deterministic fallback.
36. Destination card response includes required display fields.
37. Create planner session from selected recommendation items.
38. Planner message stores conversation entry.
39. Planner drafts Trip Memo.
40. Planner drafts Full Itinerary.
41. Planner drafts Budget Plan.
42. Planner revision updates structured documents.
43. Planner invalid revision preserves last valid documents.
44. Accept fails when one required document is missing.
45. Accept creates TripPlan with all three documents.
46. Change TripPlan visibility to public.
47. Public TripPlan appears in Explore after publish.
48. Generate share invite.
49. Join share invite as authenticated user.
50. Expired invite is rejected.
51. Revoked invite is rejected.
52. Participant list shows owner and viewer.
53. Playwright Explore browse/filter/like/save flow.
54. Playwright image-to-recommendation-to-planner flow.
55. Playwright planner revision and accept flow.
56. Playwright share invite flow.
57. `docker compose config` passes for local compose.
58. Remote compose config passes.
59. Smoke check validates web domain.
60. Smoke check validates API health and readiness.

## 24. Suggested Implementation Notes

- Implement auth and MongoDB foundation before AI flows because ownership affects most records.
- Implement root scripts early so backend, frontend, and e2e workflows are consistent from the start.
- Implement category constants in one shared backend module and mirror them in frontend schema.
- Seed destination data before implementing Places/Gemini recommendation.
- Build deterministic recommendation fallback before Gemini integration.
- Keep provider clients mockable and disabled by default in tests.
- Version structured document schemas from the first implementation.
- Add GridFS image deletion/lifecycle cleanup after core upload flow works.

Use stable ID prefixes for readability in tests and API responses:

| Prefix | Entity |
| --- | --- |
| `usr_` | User |
| `sess_` | UserSession |
| `img_` | UploadedImage |
| `cls_` | ImageClassificationResult |
| `dest_` | DestinationSeed |
| `rec_` | RecommendationRun |
| `reci_` | RecommendationItem |
| `col_` | Collection |
| `trip_` | TripPlan |
| `inv_` | ShareInvite |

## 25. Deferred Decisions

- OAuth login.
- Native mobile app.
- Real-time collaborative editing.
- Public profile pages.
- Collection sharing.
- Payment, booking, ticketing, or affiliate integrations.
- Advanced recommendation personalization.
- Admin dashboard for destination seed management.
- Automated classifier retraining pipeline.
- Object storage outside MongoDB GridFS.
- Multi-VM or Kubernetes deployment.
- Full observability stack beyond application logs and health/readiness.
- Trivy and CodeQL in CI.

## 26. Definition of Done

The SnapTrip MVP implementation is done when:

- `.agents/PRD.md` remains the canonical source of truth.
- Root scripts support install, test, typecheck, lint, and build.
- MongoDB and GridFS are implemented as canonical storage.
- Email/password auth works with session cookies.
- Explore supports public Trip Plans and category filtering.
- Like and collection save flows work for authenticated users.
- Image upload or selected saved images can start trip creation.
- PyTorch MobileNetV2 classifier returns canonical category predictions.
- User can confirm or correct categories.
- Places API enrichment and seed fallback work.
- Gemini recommendation returns validated structured destination cards.
- AI Trip Planner can draft and revise Trip Memo, Full Itinerary, and Budget Plan.
- Accepted Trip Plan stores all three structured documents.
- Share invite and participant list work.
- Playwright covers the main user journey.
- Local and remote Docker Compose configurations validate.
- GitHub Actions CI/CD deploys to the VM without Trivy or CodeQL.
- Failed post-deploy readiness can roll back without deleting MongoDB/GridFS data.
