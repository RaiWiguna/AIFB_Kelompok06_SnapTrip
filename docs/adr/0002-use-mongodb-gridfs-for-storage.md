# 0002 Use MongoDB and GridFS for Storage

| Field | Value |
| --- | --- |
| Status | Accepted |
| Date | 2026-05-08 |
| Decision scope | Persistence and image storage |

## Context

SnapTrip needs persistence for users, sessions, trip creation sessions, uploaded images, classifier results, destination seeds, place enrichments, recommendations, collections, likes, planner sessions, structured documents, Trip Plans, participants, and share invites.

The MVP also needs binary image storage for uploaded inspiration images and destination snaps. Earlier annulled documents mentioned PostgreSQL, but the current PRD selects self-hosted MongoDB and GridFS.

## Decision

SnapTrip MVP uses self-hosted MongoDB as canonical persistence and MongoDB GridFS for image binaries.

Backend integration tests must use MongoDB through testcontainers.

## Rationale

MongoDB fits the document-heavy domain model and structured AI outputs. GridFS keeps image binaries in the same self-hosted database operational boundary for MVP, reducing infrastructure surface area while preserving a path to future object storage if needed.

Testcontainers MongoDB keeps integration tests close to production persistence behavior without requiring a shared developer database.

## Consequences

- Backend storage code must target MongoDB, not PostgreSQL.
- Uploaded image binaries must go through GridFS, not local filesystem storage.
- Image metadata must live in normal MongoDB collections.
- Docker Compose must provide MongoDB for local and remote runtime.
- Deployment and rollback must preserve MongoDB/GridFS shared data.
- Tests must include MongoDB testcontainer coverage for persistence behavior.

## Follow-up

- Add MongoDB and GridFS client modules under `app/backend/app/db`.
- Add index initialization.
- Add testcontainers MongoDB dependency under `app/backend/pyproject.toml`.
- Add backup and shared-volume rules to deployment scripts.
