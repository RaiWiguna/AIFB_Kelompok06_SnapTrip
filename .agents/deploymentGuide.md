# SnapTrip Deployment Guide

| Field | Value |
| --- | --- |
| Status | Active |
| Last updated | 2026-05-23 |
| Target | One Ubuntu/Debian VM with Docker Compose and Caddy |

## 1. Production Topology

Production runs on one VM:

```text
Caddy -> Next.js web
Caddy -> FastAPI API
FastAPI -> MongoDB/GridFS
FastAPI -> Gemini
FastAPI -> Google Places API
```

Public domains:

- Web: `https://snaptrip.site`
- API: `https://api.snaptrip.site`

VM paths:

```text
/opt/snaptrip/hosted/releases/<sha>
/opt/snaptrip/hosted/current
/opt/snaptrip/hosted/current_release
/opt/snaptrip/hosted/shared/runtime.env
/opt/snaptrip/hosted/shared/mongo-data
/opt/snaptrip/hosted/shared/caddy-data
/opt/snaptrip/hosted/shared/caddy-config
```

Never delete `/opt/snaptrip/hosted/shared` during deploy or rollback.

## 2. DNS

Point both records to the VM public IPv4 address before the first deploy:

```text
snaptrip.site      A  <vm-ip>
api.snaptrip.site  A  <vm-ip>
```

The deploy preflight checks that both domains resolve. If `PRODUCTION_VM_HOST` is an IPv4 address, the domains must resolve to that IP.

## 3. VM Bootstrap

Create an SSH key pair for GitHub Actions. Put the public key into the bootstrap command and the private key into GitHub Secrets.

Run on the VM as root or with sudo:

```bash
sudo bash bootstrapscripts.sh production snaptrip-deploy "ssh-ed25519 AAAAC3... github-actions-production"
```

Equivalent direct path:

```bash
sudo bash deploy/scripts/bootstrap-vm.sh production snaptrip-deploy "ssh-ed25519 AAAAC3... github-actions-production"
```

The script installs Docker and Compose, creates `/opt/snaptrip/hosted`, creates shared data directories, creates the deploy user, installs the SSH public key, and opens SSH/HTTP/HTTPS with UFW when available.

After bootstrap, reconnect as the deploy user and verify:

```bash
docker version
docker compose version
```

Capture known hosts for GitHub:

```bash
ssh-keyscan -H <vm-host-or-ip>
```

## 4. GitHub Secrets

Set these as repository secrets or production-environment secrets before the first deploy.

| Secret | How to get it | Example value |
| --- | --- | --- |
| `PRODUCTION_VM_HOST` | Use the VM public IPv4 address or hostname from your cloud provider. It must match DNS for `snaptrip.site` and `api.snaptrip.site` when it is an IPv4 address. | `203.0.113.10` |
| `PRODUCTION_VM_USER` | Use the deploy user passed to bootstrap. The guide examples use `snaptrip-deploy`. | `snaptrip-deploy` |
| `PRODUCTION_VM_SSH_PRIVATE_KEY` | Generate an Ed25519 key pair locally, run bootstrap with the public key, then paste the full private key file contents into this secret. | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `PRODUCTION_VM_SSH_KNOWN_HOSTS` | Run `ssh-keyscan -H <vm-host-or-ip>` from your machine after the VM exists. Paste the full output. | `\|1\|hashed-host... ssh-ed25519 AAAA...` |
| `PRODUCTION_VM_SSH_PORT` | Use your VM SSH port. Optional; leave empty to default to `22`. | `22` |
| `PRODUCTION_CADDY_EMAIL` | Use your email for Caddy/Let's Encrypt certificate notices. | `you@example.com` |
| `PRODUCTION_SESSION_SECRET` | Generate a long random value. Use `openssl rand -base64 48` on Linux/macOS/Git Bash, or `[Convert]::ToBase64String((1..48 \| ForEach-Object { Get-Random -Max 256 }))` in PowerShell. | `bXktcmFuZG9tLTQ4LWJ5dGUtc2VjcmV0...` |
| `PRODUCTION_MONGO_ROOT_USERNAME` | Choose a MongoDB root username for the production Compose service. Use letters/numbers/underscore. | `snaptrip_root` |
| `PRODUCTION_MONGO_ROOT_PASSWORD` | Generate a strong password. Avoid characters that are hard to copy into env files if possible. `openssl rand -base64 36` is fine. | `yJ8Jt4RJ0dYh2pF9zjV2M0mJbZ9l7xTg` |
| `PRODUCTION_MONGO_DATABASE` | Use the app database name. Keep this stable across deploys. | `snaptrip` |
| `PRODUCTION_GEMINI_API_KEY` | Create an API key in Google AI Studio for Gemini Developer API, or use the key issued for this project. Keep it backend-only. | `AIza...` |
| `PRODUCTION_GOOGLE_PLACES_API_KEY` | Create a Google Cloud API key with Places API enabled. Restrict it for server usage where possible. Keep it backend-only. | `AIza...` |
| `PRODUCTION_GOOGLE_MAPS_BROWSER_API_KEY` | Create a separate browser API key with Maps JavaScript API enabled. Restrict it to `https://snaptrip.site/*`. This is the only frontend-exposed provider key. | `AIza...` |

Suggested local key generation for GitHub Actions SSH:

```bash
mkdir -p tmp/deploy-keys
ssh-keygen -t ed25519 -C "github-actions-snaptrip-production" -N "" -f tmp/deploy-keys/snaptrip-gh-actions
```

Use the public key in the VM bootstrap command:

```bash
sudo bash bootstrapscripts.sh production snaptrip-deploy "$(cat tmp/deploy-keys/snaptrip-gh-actions.pub)"
```

Set `PRODUCTION_VM_SSH_PRIVATE_KEY` to the contents of:

```text
tmp/deploy-keys/snaptrip-gh-actions
```

Set `PRODUCTION_VM_SSH_KNOWN_HOSTS` with:

```bash
ssh-keyscan -H <vm-host-or-ip>
```

The deploy workflow renders `/opt/snaptrip/hosted/shared/runtime.env` atomically from these secrets. Do not create or commit real env files.

## 5. CI/CD Behavior

CI runs on pushes and pull requests targeting `main` unless the change is docs-only or non-runtime-only.

CI validates:

```bash
npm ci
npx playwright install --with-deps chromium
npm run lint
npm run typecheck
npm test
npm run build
docker compose config
docker compose build
docker compose --env-file deploy/env/runtime.production.env.example -f deploy/compose/docker-compose.remote.yml config
docker compose --env-file deploy/env/runtime.production.env.example -f deploy/compose/docker-compose.remote.yml build
```

Production deploy runs after successful `main` CI or by manual dispatch in `.github/workflows/deploy-production.yml`.

Deploy steps:

1. Resolve git SHA.
2. Validate required secrets.
3. Upload source archive to `/opt/snaptrip/hosted/releases/<sha>`.
4. Render and atomically upload shared `runtime.env`.
5. Run remote preflight.
6. Build and start remote Compose.
7. Smoke check web/API.
8. Validate `/ready`.
9. Roll back to the previous release if validation fails and a previous release exists.

## 6. Manual Commands

Validate local and remote Compose config:

```bash
npm run docker:config
```

Manual deploy to an already uploaded release:

```bash
bash /opt/snaptrip/hosted/releases/<sha>/deploy/scripts/remote-preflight.sh \
  production <sha> /opt/snaptrip/hosted /opt/snaptrip/hosted/shared/runtime.env \
  snaptrip.site api.snaptrip.site <vm-ip>

bash /opt/snaptrip/hosted/releases/<sha>/deploy/scripts/remote-deploy.sh \
  production <sha> /opt/snaptrip/hosted /opt/snaptrip/hosted/shared/runtime.env <previous-sha-or-empty> \
  https://snaptrip.site https://api.snaptrip.site/health https://api.snaptrip.site/ready
```

Manual rollback:

```bash
bash /opt/snaptrip/hosted/releases/<previous-sha>/deploy/scripts/remote-rollback.sh \
  production <previous-sha> /opt/snaptrip/hosted /opt/snaptrip/hosted/shared/runtime.env \
  https://snaptrip.site https://api.snaptrip.site/health https://api.snaptrip.site/ready
```

Smoke checks:

```bash
bash deploy/scripts/smoke-check.sh \
  https://snaptrip.site \
  https://api.snaptrip.site/health \
  https://api.snaptrip.site/ready

bash deploy/scripts/assert-ready.sh https://api.snaptrip.site/ready
```

## 7. Race-Safety And Rollback Guarantees

- GitHub Actions deploy uses `concurrency: deploy-production` with `cancel-in-progress: false`.
- Remote deploy and rollback both acquire `/opt/snaptrip/hosted/deploy.lock` with `flock`.
- Release directories are immutable by SHA.
- `runtime.env` upload uses a temporary file and atomic `mv`.
- `current` and `current_release` switch only after service health checks pass.
- MongoDB/GridFS data and Caddy data/config live under shared storage and are never deleted by deploy or rollback.
- Release cleanup keeps the latest five release directories after successful deploy.

## 8. Troubleshooting

If Caddy cannot issue TLS certificates:

- Confirm DNS points to the VM.
- Confirm ports `80` and `443` are open.
- Check Caddy logs with `docker logs`.

If API readiness fails:

- Check `docker compose --env-file /opt/snaptrip/hosted/shared/runtime.env -f /opt/snaptrip/hosted/current/deploy/compose/docker-compose.remote.yml ps`.
- Check API logs.
- Confirm Mongo credentials and database values in GitHub Secrets.

If recommendation generation falls back unexpectedly:

- Confirm `PRODUCTION_GEMINI_API_KEY` and `PRODUCTION_GOOGLE_PLACES_API_KEY`.
- Confirm the rendered runtime env has `USE_GEMINI=true` and `USE_GOOGLE_PLACES=true` through the remote Compose API service environment.

If image uploads disappear after deploy:

- Stop immediately and inspect `/opt/snaptrip/hosted/shared/mongo-data`.
- Do not remove Docker volumes or shared directories.
- Roll back to the previous release before attempting cleanup.
