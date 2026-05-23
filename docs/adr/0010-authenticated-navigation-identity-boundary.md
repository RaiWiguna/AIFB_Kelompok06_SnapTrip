# 0010 Authenticated Navigation Identity Boundary

| Field | Value |
| --- | --- |
| Status | Accepted |
| Date | 2026-05-24 |
| Decision scope | Authenticated frontend navbar identity, dual-mode Explore routing, and public/auth navigation boundaries |

## Context

SnapTrip has public pages and authenticated workspace pages. The authenticated navbar had drifted because most pages rendered `AppHeader` without passing the backend user, causing the component to fall back to a static mock identity while Explore used the real registered user.

Explore is also a dual-mode route: anonymous users can browse public trips, while signed-in users should see the workspace header and authenticated actions.

## Decision

- `AppHeader` requires an explicit current-user display object and no longer owns a default/mock user.
- Server-rendered authenticated pages use a shared server auth helper and `AuthenticatedAppHeader` wrapper to fetch `/api/auth/me`, pass the real user to `AppHeader`, and redirect unauthenticated users to contextual sign-in.
- Client-rendered authenticated step pages receive the header user from their server page and pass it to `AppHeader`.
- `/explore` remains public for signed-out visitors.
- Signed-in visitors to `/explore` are redirected to `/explore?as=user`; category filters are preserved.
- Public trip detail remains anonymous-readable with `SiteHeader`; signed-in visitors get `AppHeader`.
- Authenticated links to Explore use `/explore?as=user`, while public marketing/auth/error surfaces keep public `/explore` links.
- Static `Lintang` identity references are removed from runtime and test source.

## Rationale

Keeping identity resolution at the server boundary prevents every page from inventing its own navbar user behavior and avoids hydration-time identity drift. Making `AppHeader` require a user object turns missing identity into a type error instead of a production UI regression.

Explore keeps one route for public browsing while making the authenticated mode explicit with `as=user`, which preserves existing contextual sign-in and public SEO/share behavior.

## Consequences

- Any new authenticated page must either use `AuthenticatedAppHeader` or pass a real `AppHeaderUser`.
- Client components that render the authenticated header need their server page to provide `headerUser`.
- Signed-in users cannot remain on public Explore mode through normal navigation.
- Public trip details must stay dual-mode unless their visibility model changes.

## Verification

- `rg -n "Lintang|lintang" app tests`
- `npm run typecheck:frontend`
- `npm run lint:frontend`
- `npm run test:e2e`
- `npm test`
