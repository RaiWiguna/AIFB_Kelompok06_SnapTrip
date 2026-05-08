# 0004 Use Single-VM Docker Compose and Caddy Deployment

| Field | Value |
| --- | --- |
| Status | Accepted |
| Date | 2026-05-08 |
| Decision scope | Hosted runtime, deployment, and rollback |

## Context

SnapTrip MVP targets a monolithic single-VM deployment. The runtime includes web, API, MongoDB/GridFS, and Caddy. The public domains are `snaptrip.site` and `api.snaptrip.site`.

The project must not depend on external repository deployment scripts. Deployment behavior must be written explicitly for SnapTrip.

## Decision

SnapTrip deploys to a single VM using Docker Compose and Caddy.

Required release layout:

```text
/opt/snaptrip/hosted/releases/<sha>
/opt/snaptrip/hosted/current
/opt/snaptrip/hosted/current_release
/opt/snaptrip/hosted/shared
```

Required deployment assets:

- root `docker-compose.yml` for local development only,
- `deploy/compose/docker-compose.remote.yml` for production remote compose,
- `deploy/caddy/Caddyfile`,
- `deploy/env/runtime.production.env.example`,
- `deploy/scripts/bootstrap-vm.sh`,
- `deploy/scripts/remote-preflight.sh`,
- `deploy/scripts/remote-deploy.sh`,
- `deploy/scripts/remote-rollback.sh`,
- `deploy/scripts/assert-ready.sh`,
- `deploy/scripts/smoke-check.sh`.

## Rationale

Single-VM Docker Compose is sufficient for MVP and keeps operations understandable. Caddy handles TLS and routing. A source-archive release layout allows rollback by switching the `current` symlink without deleting shared persistent data.

## Consequences

- MongoDB must persist under shared storage.
- Caddy data/config must persist under shared storage.
- Rollback changes code/runtime only and must not delete MongoDB/GridFS data.
- GitHub Actions deploy must upload a source archive, render runtime env, run remote deploy, validate readiness, and rollback on failed validation.
- Trivy and CodeQL are excluded unless the PRD is revised.

## Follow-up

- Implement Dockerfiles for `app/backend` and `app/frontend`.
- Implement remote compose and Caddyfile.
- Implement deploy scripts explicitly for SnapTrip.
- Add GitHub Actions CI/deploy workflows with path filters.
