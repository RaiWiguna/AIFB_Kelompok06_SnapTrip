# Contributing Guide

This guide defines the expected workflow for SnapTrip contributors and future Codex sessions.

## Source of Truth

Read these before changing product behavior, architecture, deployment, or roadmap:

1. `.agents/rules.md`
2. `.agents/sessionHandoff.md`
3. `.agents/implementationPhase.md`
4. `.agents/PRD.md`
5. relevant ADRs under `docs/adr/`

Do not rely on annulled drafts or old README assumptions when they conflict with `.agents/PRD.md`.

## Branch Naming

Use descriptive branch names with a conventional prefix.

Preferred prefixes:

- `feat/` for new product or technical capabilities.
- `fix/` for bug fixes.
- `docs/` for documentation-only changes.
- `chore/` for maintenance and repo hygiene.
- `test/` for test-only changes.
- `refactor/` for behavior-preserving code restructuring.
- `ci/` for GitHub Actions and automation.
- `build/` for Docker, packaging, or build-system work.

Examples:

```text
feat/backend-auth-foundation
feat/frontend-explore-feed
fix/session-cookie-expiry
docs/update-agent-handoff
ci/add-runtime-path-filters
build/add-remote-compose
```

Keep branch names lowercase and use hyphens.

## Commit Messages

Use conventional commits:

```text
type: concise imperative subject
```

Preferred types:

- `feat:`
- `fix:`
- `docs:`
- `chore:`
- `test:`
- `refactor:`
- `perf:`
- `ci:`
- `build:`

Examples:

```text
feat: add session login endpoint
fix: reject expired share invites
docs: update implementation handoff
ci: add deployment path filters
```

Rules:

- Use imperative mood.
- Keep the subject concise and specific.
- Do not end the subject with a period.
- Prefer one logical change per commit.
- Use `docs:` or `chore:` for `.agents/`, `docs/`, or `training/`-only scaffold/documentation work.

## Required Checks Before Commit

When the relevant files exist, run these from the repository root before committing runtime changes:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run docker:config
```

For backend-only changes, at minimum run:

```bash
npm run lint:backend
npm run typecheck:backend
npm run test:backend
```

For frontend-only changes, at minimum run:

```bash
npm run lint:frontend
npm run typecheck:frontend
npm run test:frontend
```

For E2E-impacting flows, also run:

```bash
npm run test:e2e
```

For documentation-only or scaffold-only changes, runtime checks may be skipped if no runnable runtime exists. State that clearly in the final handoff or PR summary.

## Root Script Contract

Root npm is the standard entrypoint. Backend commands must run through `uv`.

Expected script shape:

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

Implementation may add extra scripts, but must preserve these root-level names and backend-through-`uv` behavior.

## Repository Layout Rules

Runtime code must live under:

```text
app/backend/
app/frontend/
```

Do not recreate top-level `backend/` or `frontend/` directories unless `.agents/PRD.md`, `.agents/implementationPhase.md`, and the relevant ADR are revised first.

Other important paths:

- `tests/e2e/` for cross-runtime Playwright tests.
- `deploy/` for Caddy, Compose, env examples, and deployment scripts.
- `docs/adr/` for Architecture Decision Records.
- `training/` for offline ML training assets only.
- `.agents/` for project memory and source-of-truth documents.

## CI/CD Path Rules

Hosted-runtime CI/CD should run for changes under:

- `app/backend/**`
- `app/frontend/**`
- `tests/**`
- `deploy/**`
- `.github/workflows/**`
- `docker-compose.yml`
- `package.json`
- `package-lock.json`
- `app/backend/pyproject.toml`
- `app/backend/uv.lock`

Hosted-runtime CI/CD and production deploy must not run for changes limited to:

- `.agents/**`
- `docs/**`
- `training/**`
- `drafts/**`
- `examples/**`
- `*.md`

If a change touches both runtime and non-runtime files, run CI/CD based on the runtime files.

CI/CD explicitly excludes Trivy and CodeQL unless the PRD is revised.

## ADR and Handoff Updates

Update `.agents/sessionHandoff.md` after major sessions.

Add or update an ADR under `docs/adr/` when a session introduces or changes a durable architecture decision.

Do not add ADRs for minor implementation details that are already covered by the baseline ADR.

## Secrets and Environment Files

- Do not commit real secrets.
- Use fake local values in `.env.local` placeholders.
- Provider keys for Gemini and Google Places API are backend-only.
- The frontend must never call Gemini, Places API, MongoDB, GridFS, or classifier runtime directly.

## Pull Request Expectations

A good PR description should include:

- what changed,
- why it changed,
- commands run,
- commands skipped and why,
- screenshots for meaningful frontend UI changes,
- migration or deployment notes when relevant.
