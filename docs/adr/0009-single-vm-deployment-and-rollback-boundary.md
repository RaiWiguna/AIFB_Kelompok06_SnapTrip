# 0009 Single VM Deployment and Rollback Boundary

| Field | Value |
| --- | --- |
| Status | Accepted |
| Date | 2026-05-23 |
| Decision scope | Phase 10 Docker, single-VM Compose deployment, GitHub Actions deploy, rollback, and deploy race-safety |

## Context

SnapTrip needs a first production deployment path that matches the PRD baseline: one VM, Docker Compose, Caddy, MongoDB/GridFS persistence, and GitHub Actions delivery to `snaptrip.site` and `api.snaptrip.site`.

The previous remote Compose file was intentionally a Mongo-only placeholder. Phase 10 replaces that placeholder with an operational deployment boundary while preserving the deferred Phase 11 planner scope.

## Decision

Runtime packaging:

- Backend runtime is packaged with `app/backend/Dockerfile`, Python 3.12, `uv sync --frozen --no-dev`, and Uvicorn on port `8000`.
- Frontend runtime is packaged with `app/frontend/Dockerfile`, Node 22, `npm ci`, `next build`, pruned production dependencies, and Next start on port `3000`.
- Root local Compose is development-only and runs MongoDB, API, and web with mock provider defaults.

Remote production topology:

- `deploy/compose/docker-compose.remote.yml` runs `caddy`, `mongo`, `api`, and `web`.
- MongoDB is internal-only and persists under `/opt/snaptrip/hosted/shared/mongo-data`.
- Caddy is the only public entrypoint and persists certificate/config state under shared storage.
- Production requires real Gemini and Google Places API secrets before deploy.
- The browser Google Maps key is exposed only as `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY` and must be domain-restricted.

Release and rollback:

- GitHub Actions uploads a source archive for one git SHA into `/opt/snaptrip/hosted/releases/<sha>`.
- Runtime env is stored at `/opt/snaptrip/hosted/shared/runtime.env`, outside immutable release directories.
- Deploy and rollback use the same remote lock file, `/opt/snaptrip/hosted/deploy.lock`.
- The `current` symlink and `current_release` file are updated only after service health checks, public smoke checks, and semantic readiness validation pass.
- Rollback switches to a previous release directory and restarts the same Compose project without deleting shared data.
- Shared MongoDB/GridFS and Caddy directories are never deleted by deploy or rollback.

CI/CD:

- Hosted-runtime CI runs lint, typecheck, tests, build, local Compose validation/build, and remote Compose validation/build.
- Production deploy runs after successful CI on `main` and can also be manually dispatched by ref.
- Deploy uses `concurrency: deploy-production` with `cancel-in-progress: false`.
- CI/CD excludes Trivy and CodeQL.
- CI/CD does not run for `.agents/**`, `docs/**`, `training/**`, `drafts/**`, `examples/**`, or root `*.md` only changes.

## Rationale

Source-archive deployment keeps the first production path simple and auditable. The VM builds from the exact git SHA that GitHub Actions checked out, which avoids registry setup while preserving reproducibility through lockfiles.

The shared directory layout separates persistent state from release code. This is what makes rollback data-safe for MongoDB/GridFS uploads and Caddy certificates.

The dual locking strategy addresses two race classes: GitHub Actions prevents overlapping production deploy jobs, and remote `flock` prevents overlap between CI deploys and manual SSH operations.

## Consequences

- Production deployment depends on Docker build success on the VM.
- Failed post-deploy validation rolls back only when a previous release exists.
- `CLASSIFIER_MODE=real` is now the production default after the MobileNetV4 Medium v2 artifact promotion recorded in ADR 0011.
- Real planner chat, accepted document persistence, invites, and participants remain out of scope until after this deployment foundation.

## Verification

Required verification for this boundary:

- `bash -n bootstrapscripts.sh deploy/scripts/*.sh`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run docker:config`
- `docker compose build`
- `docker compose --env-file deploy/env/runtime.production.env.example -f deploy/compose/docker-compose.remote.yml build`
- Manual race-safety review of workflow concurrency, remote lock usage, symlink switching, and shared data preservation.
