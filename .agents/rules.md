# Internals Rules

| Field | Value |
| --- | --- |
| Document status | Active |
| Created | 2026-05-08 |
| Last updated | 2026-05-08 |
| Purpose | Operating rules for Codex when reading or updating `.agents/`, `docs/adr/`, and long-lived SnapTrip project memory |

## 1. Why This Folder Exists

The `.agents/` folder is the project memory and execution layer for SnapTrip.

It exists to:

- preserve product and implementation intent across sessions,
- prevent re-planning work that is already decided,
- keep future sessions aligned with the current repo state,
- record what was completed, what is next, and where to start,
- preserve canonical decisions after annulled drafts and old README assumptions stop being authoritative.

If code changes materially affect roadmap, deployment, scope, architecture, API contracts, AI behavior, or recommended next steps, `.agents/` should usually be updated in the same session.

`.agents/` must not be deleted during cleanup, reset, scaffold, or start-from-scratch work unless the user explicitly asks to delete `.agents/` by name.

## 2. File Roles

### 2.1 Product and Technical Source of Truth

Read this first when behavior, scope, stack, user flow, API contract, AI behavior, or deployment requirements are unclear:

- `.agents/PRD.md`
  - product contract,
  - business rules,
  - expected user behavior,
  - user roles,
  - user flows,
  - functional requirements,
  - API contracts,
  - domain model,
  - AI/provider requirements,
  - deployment and CI/CD requirements.

There are currently no dedicated design files such as `frontendDesign.md`, `adminFrontendDesign.md`, or `publicFrontendDesign.md` in `.agents/`.

Until those exist, treat these as the practical design-intent source of truth:

- `.agents/PRD.md`,
- `.agents/implementationPhase.md`,
- the latest relevant handoff file,
- existing implementation under `app/frontend/` when it exists,
- relevant ADRs under `docs/adr/`.

### 2.2 Execution and Planning Source of Truth

Read this before planning or continuing implementation:

- `.agents/implementationPhase.md`
  - master roadmap,
  - current execution assumptions,
  - phase sequencing,
  - recommended first execution batch,
  - CI/CD path filter contract,
  - ADR backlog,
  - post-deployment placement of the agentic planner work.

There are currently no dedicated files for:

- `phaseBacklog.md`,
- `environmentMatrix.md`,
- `deploymentGuide.md`,
- `releaseExecutionChecklist.md`,
- `manualProvisioningChecklist.md`,
- `productionReadinessChecklist.md`.

Until those exist, use `.agents/PRD.md`, `.agents/implementationPhase.md`, and relevant `docs/adr/` entries together for roadmap, deployment, and traceability decisions.

These should be updated whenever implementation changes alter roadmap status, environment assumptions, deployment/provisioning requirements, API contracts, AI/provider behavior, or the recommended next session start.

### 2.3 Session Continuity Files

Use these to resume work efficiently:

- `.agents/sessionHandoff.md`
  - high-signal snapshot of the last meaningful work,
  - verification run,
  - repo facts,
  - known blockers,
  - next recommended start.

If future sessions adopt dated handoffs, use:

- `.agents/sessionHandoff-YYYY-MM-DD.md`

If a future session creates a dedicated `phase{N}Kickoff.md`, treat it as a phase-specific starter. Until then, use the newest handoff plus `.agents/implementationPhase.md` instead of assuming a kickoff file already exists.

### 2.4 Traceability and Support Docs

Current traceability sources:

- `.agents/PRD.md`
  - PRD-to-code coverage source,
  - API/domain/AI/deployment contract.
- `.agents/implementationPhase.md`
  - phase-to-code execution source,
  - sequencing and backlog substitute.
- `docs/adr/`
  - accepted architecture decisions,
  - frozen runtime, contract, provider, storage, and topology choices future sessions should not silently re-decide.
- `README.md`
  - public project overview,
  - repository layout summary,
  - developer entrypoint summary,
  - local/deployment status summary.
- `CONTRIBUTING.md`
  - branch naming rules,
  - commit message rules,
  - checks expected before commit,
  - root script contract summary,
  - PR expectations.

`README.md` and `CONTRIBUTING.md` are contributor-facing summaries. They must not override `.agents/PRD.md`, `.agents/implementationPhase.md`, `.agents/rules.md`, or accepted ADRs. If they conflict, update them to match the `.agents/` source of truth.

If a dedicated requirement traceability matrix is added later, treat it as the first stop for PRD-to-code coverage checks. Until then, use `.agents/PRD.md`, `.agents/implementationPhase.md`, relevant ADRs, `README.md`, and `CONTRIBUTING.md` together for traceability.

Update these when requirement-to-implementation mapping changes or when the recommended next work changes materially.

### 2.5 Architecture Decision Records

Use `docs/adr/` when a session makes or materially changes a long-lived technical decision.

Typical ADR-worthy changes include:

- contract shape changes that affect multiple app modules or future work,
- runtime topology decisions such as service layout, storage, provider boundaries, or background workers,
- deployment or operational architecture decisions that future sessions must preserve,
- persistence/storage decisions such as MongoDB/GridFS lifecycle or indexing strategy,
- AI/provider decisions such as Gemini tool boundaries, structured output schemas, or classifier training/runtime separation,
- CI/CD decisions such as path filters, release layout, rollback behavior, or VM deploy mechanics,
- an implementation choice that intentionally narrows future options.

ADR files should:

- use the next sequential `000N-kebab-case-title.md` filename,
- state status, date, and decision scope near the top,
- separate context, decision, rationale, consequences, and follow-up clearly,
- describe the durable decision, not just the code diff,
- avoid roadmap phase references such as `Phase 4` or `Phase 8`,
- describe concrete future work when needed without tying the decision to a schedule label.

If a session changes an existing accepted architecture decision, update the affected ADR or add a superseding ADR in the same session.

## 3. Recommended Read Order for Future Sessions

For most implementation sessions, read in this order:

1. `.agents/rules.md`
2. newest `.agents/sessionHandoff*.md`, if present
3. `.agents/implementationPhase.md`
4. `.agents/PRD.md`
5. relevant `docs/adr/` entries when the task touches architecture, contracts, runtime behavior, storage, AI providers, deployment shape, CI/CD, or security
6. `README.md` and `CONTRIBUTING.md` when the task affects contributor workflow, public project guidance, branch naming, checks, scripts, or onboarding

For docs-only sessions, read:

1. `.agents/rules.md`
2. the target document
3. `.agents/PRD.md` or `.agents/implementationPhase.md` if the target document references product or execution facts
4. `README.md` and `CONTRIBUTING.md` when updating contributor-facing docs or repo onboarding docs

For deployment/CI/CD sessions, read:

1. `.agents/rules.md`
2. `.agents/implementationPhase.md`
3. `.agents/PRD.md`
4. relevant `docs/adr/` deployment/runtime entries, if present
5. `README.md` and `CONTRIBUTING.md`
6. actual files under `deploy/`, `.github/workflows/`, root `package.json`, and Compose files when they exist

## 4. When To Update Existing Files

Update `.agents/PRD.md` when:

- product behavior changes,
- user flows change,
- user roles or permissions change,
- API contract changes materially,
- domain model changes materially,
- AI/classifier/provider behavior changes materially,
- stack or deployment decisions change,
- success criteria or non-goals change.

Update `.agents/implementationPhase.md` when:

- a phase changes from pending to complete in repo terms,
- sequencing changes,
- recommended next work changes,
- the recommended first execution batch changes,
- deployment/runtime assumptions change,
- CI/CD path filter rules change,
- the scaffold layout changes,
- agentic planner sequencing changes.

Update `.agents/sessionHandoff.md` or create a dated handoff when:

- a major session changes the repo materially,
- verification results matter for the next session,
- blockers or caveats should not be rediscovered,
- the next recommended start changes.

Update `README.md` when:

- repository layout changes,
- project overview changes,
- setup commands or root script expectations change,
- local development status changes,
- deployment target summary changes.

Update `CONTRIBUTING.md` when:

- branch naming rules change,
- commit message rules change,
- required pre-commit checks change,
- root script contract changes,
- CI/CD path rules change,
- PR expectations change.

Update or add an ADR when:

- a long-lived architecture decision was made during the session,
- an accepted technical decision changed in a way future sessions must know,
- code now implements a previously planned architecture choice and the decision should be frozen in repo memory.

Examples:

- A backend foundation phase finishes:
  - update `.agents/implementationPhase.md`,
  - update the latest handoff,
  - add an ADR if storage/auth/runtime boundaries were finalized.
- Deployment env templates or GitHub secrets change:
  - update `.agents/PRD.md` if the contract changes,
  - update `.agents/implementationPhase.md`,
  - add or update an ADR if the deploy mechanism is now frozen.
- A new provider boundary or storage lifecycle becomes part of architecture:
  - add or update a `docs/adr/` entry.

## 5. When To Add A New File

Add a new file in `.agents/` when:

- a new phase needs a dedicated kickoff/start document,
- a major session materially changes the repo and needs a fresh handoff,
- a new category of long-lived operational knowledge appears and does not fit an existing file cleanly,
- a new canonical runbook is needed for a distinct area,
- adding the content to an existing file would make that file confusing or overload its purpose.

Examples:

- Starting a large implementation phase:
  - add `phase{N}Kickoff.md`.
- After a large session that changes the recommended next start:
  - add `sessionHandoff-YYYY-MM-DD.md`.
- If deployment or security hardening gets large enough:
  - add a focused runbook instead of overloading `.agents/implementationPhase.md`.

## 6. When Not To Add A New File

Do not add a new file when:

- the information is only a minor status update to an existing roadmap or handoff,
- the content belongs naturally in `.agents/PRD.md`, `.agents/implementationPhase.md`, or the latest handoff,
- the new file would duplicate information already documented elsewhere,
- the change is temporary scratch work that will not help future sessions.

Default to updating an existing file unless there is a clear reason to split.

## 7. Naming Rules

Use these patterns:

- `.agents/PRD.md`
- `.agents/implementationPhase.md`
- `.agents/rules.md`
- `.agents/sessionHandoff.md`
- `.agents/sessionHandoff-YYYY-MM-DD.md`
- `.agents/phase{N}Kickoff.md`
- descriptive long-lived docs in `camelCase.md` only when they represent a stable concept already used in this folder
- ADRs in `docs/adr/000N-kebab-case-title.md`

New `.agents/` files should have:

- a one-line purpose near the top,
- document status,
- creation date,
- enough context for a future session to use the file without rereading unrelated files first.

## 8. Repository Layout Rules

SnapTrip runtime code uses this top-level layout:

```text
app/
  backend/
  frontend/
```

Rules:

- Backend runtime code belongs under `app/backend/`.
- Frontend runtime code belongs under `app/frontend/`.
- Cross-runtime E2E tests belong under `tests/e2e/`.
- Offline ML training assets belong under `training/`.
- ADRs belong under `docs/adr/`.
- Deployment assets belong under `deploy/`.
- GitHub Actions workflows belong under `.github/workflows/`.
- Do not recreate top-level `backend/` or `frontend/` directories unless the PRD and roadmap are explicitly changed first.
- Do not import from `training/**` in backend or frontend runtime code.

## 9. Scaffold and Reset Rules

When creating a clean scaffold:

- Preserve `.agents/`.
- Preserve user-provided source documents inside `.agents/`, including PDF references.
- Create empty runtime directories with `.gitkeep` when needed.
- Use `app/backend/` and `app/frontend/`.
- Keep `training/**` separated from backend/frontend runtime code.
- Keep ADRs under `docs/adr/`.
- Add local env templates/placeholders only with fake values.
- Do not commit real secrets.

When removing old files:

- Do not remove `.git/`.
- Do not remove `.agents/`.
- Do not remove `docs/adr/` once ADRs exist.
- Do not remove `training/**` when it contains user-provided datasets, notebooks, or model outputs unless explicitly requested.
- Do not remove user-provided PDFs or source reference files inside `.agents/` unless explicitly requested.

## 10. Root Script Rules

Root `package.json` is the standard developer entrypoint.

Rules:

- Root npm scripts must orchestrate both `app/frontend` and `app/backend`.
- Backend scripts must run through `uv`.
- Frontend scripts must run through npm with `--prefix app/frontend`.
- Developers should not need to remember direct backend/frontend commands for standard install, dev, test, typecheck, lint, build, or Docker config workflows.

Required script behavior:

- `npm install` prepares root tooling and runs both frontend npm install and backend `uv sync`.
- `npm run dev` runs frontend and backend dev servers together.
- `npm run test` runs backend pytest, frontend unit tests, and Playwright E2E where configured.
- `npm run typecheck` runs frontend TypeScript checks and backend static validation.
- `npm run lint` runs frontend lint and backend lint/format checks.
- `npm run build` runs frontend build and backend build-validation checks.
- `npm run docker:config` validates local and remote Compose configuration.

## 11. CI/CD Path Rules

Hosted-runtime CI/CD and production deploy should trigger only for runtime, test, deploy, dependency, Docker, and workflow changes.

Hosted-runtime relevant paths:

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

Changes limited to these paths must not trigger hosted-runtime CI/CD or production deploy:

- `.agents/**`
- `docs/**`
- `training/**`
- `drafts/**`
- `examples/**`
- `*.md`

If a change touches both non-runtime paths and runtime paths, CI/CD should run based on the runtime change.

CI/CD must explicitly exclude Trivy and CodeQL unless the PRD is revised.

## 12. Commit Message Rules

Use a conventional prefix for new commit messages. The subject must start with a lowercase type followed by a colon and a space.

Preferred types:

- `feat:` for user-visible features or new capabilities,
- `fix:` for bug fixes, regressions, security fixes, and broken behavior,
- `chore:` for maintenance, dependency updates, tooling, repo hygiene, or generated updates,
- `docs:` for documentation-only changes,
- `test:` for test-only changes,
- `refactor:` for behavior-preserving code restructuring,
- `perf:` for performance improvements,
- `ci:` for GitHub Actions, deploy pipeline, and automation changes,
- `build:` for build system, packaging, Dockerfile, or artifact changes.

Subject rules:

- write in imperative mood, for example `fix: reject invalid invite tokens`,
- keep the subject concise and specific, ideally 72 characters or fewer,
- do not end the subject with a period,
- use a body when the reason, migration impact, or operational caveat is not obvious from the subject,
- prefer one logical change per commit; split unrelated runtime, docs, and deployment changes when practical.

If a change spans multiple categories, choose the prefix that best describes the user-visible or operational effect. For example, a code change with tests should usually be `feat:` or `fix:`, not `test:`.

Documentation-only `.agents/`, `docs/`, or `training/` scaffold changes should usually use `docs:` or `chore:`.

## 13. Content Rules

When updating or adding files in `.agents/`:

- write for future Codex sessions, not for marketing or external users,
- optimize for high-signal continuity,
- keep absolute product facts and current repo facts separate,
- state whether something is complete in repo terms or still requires external provisioning,
- call out frozen decisions that must not be re-decided,
- note important caveats that can save a future session from bad assumptions,
- avoid duplicating annulled drafts,
- keep references SnapTrip-specific and avoid pointing to unrelated external repos as implementation requirements.

When updating or adding ADRs:

- explain the durable technical decision and why it was chosen,
- capture tradeoffs and operational caveats, not just happy-path outcomes,
- note follow-up work if the decision intentionally defers later improvements,
- avoid referencing roadmap phase labels as the reason for the decision.

## 14. Required Updates After Major Sessions

After a major implementation or deployment-prep session, usually do all of the following:

1. update `.agents/implementationPhase.md`,
2. update `.agents/sessionHandoff.md` or create a new dated handoff,
3. update `.agents/PRD.md` if product, API, domain, AI, stack, deployment, or CI/CD contracts changed,
4. update any affected environment/deployment docs if those docs exist,
5. add the next phase kickoff file if the next session start is now clear and large enough to justify it,
6. add or update a `docs/adr/` entry if the session introduced or changed a durable architecture decision.

If future sessions make these stale, update them before ending the session.

## 15. Frozen Decisions

Do not silently re-decide these without updating `.agents/PRD.md`, `.agents/implementationPhase.md`, and relevant ADRs:

- SnapTrip is desktop-first web for MVP.
- Runtime app layout is `app/backend` and `app/frontend`.
- Backend is Python FastAPI with `uv`.
- Frontend is Next.js, Node.js, TypeScript, and Vitest.
- Database is self-hosted MongoDB.
- Images use MongoDB GridFS.
- Backend integration tests use MongoDB testcontainers.
- Image classifier uses PyTorch MobileNetV2.
- Canonical categories are `pantai`, `gunung`, `air_terjun`, and `wisata_tradisional`.
- Gemini and Google Places API are backend-only.
- LLM/agent output must be validated structured JSON before persistence or UI rendering.
- Agentic planner implementation comes after Docker, remote compose, Caddy, and GitHub Actions deployment foundation.
- Root npm scripts orchestrate frontend npm and backend `uv`.
- Root `docker-compose.yml` is local development only.
- Remote production compose lives at `deploy/compose/docker-compose.remote.yml`.
- Deployment uses single VM, Docker Compose, Caddy, `snaptrip.site`, and `api.snaptrip.site`.
- Hosted-runtime CI/CD must not trigger for `.agents/**`, `docs/**`, or `training/**`-only changes.
- CI/CD excludes Trivy and CodeQL.
