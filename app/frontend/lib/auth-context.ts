/**
 * Auth context helpers — surface contextual copy on /signin and /signup
 * when a protected action triggered the redirect.
 *
 * Per §16.7: "Auth pages must support contextual copy when triggered by a
 * protected action and return the user to that action after completion."
 */

export type AuthAction =
  | "plan" // Start a new trip
  | "save" // Save to collection
  | "like" // Like a public trip
  | "invite" // Open / accept an invite
  | "publish" // Publish a trip to Explore
  | "trips" // View own trips
  | "collections" // View own collections

const COPY: Record<AuthAction, { title: string; body: string }> = {
  plan: {
    title: "Sign in to start planning.",
    body: "An account lets you keep your images private, draft itineraries, and invite participants when you're ready.",
  },
  save: {
    title: "Sign in to save this to a collection.",
    body: "Collections are personal mood boards you can later turn into a full plan.",
  },
  like: {
    title: "Sign in to like trips.",
    body: "Likes seed your future plans — they're private to you.",
  },
  invite: {
    title: "Sign in to open this invite.",
    body: "Joining an invite keeps the trip listed under My Trips and respects the owner's visibility.",
  },
  publish: {
    title: "Sign in to publish your trip.",
    body: "Publishing makes an accepted plan discoverable in Explore — you can change visibility any time.",
  },
  trips: {
    title: "Sign in to see your trips.",
    body: "Your drafts and accepted plans live under My Trips.",
  },
  collections: {
    title: "Sign in to view your collections.",
    body: "Collections are private boards you can use to seed new trips.",
  },
}

const FALLBACK = {
  title: "Welcome back.",
  body: "Pick up exactly where you left off — your memos, drafts, and collections are waiting.",
}

const SAFE_NEXT_PREFIXES = [
  "/new",
  "/plan",
  "/trips",
  "/collections",
  "/account",
  "/explore",
  "/invite",
  "/likes",
]

export function isSafeNext(value: string | null | undefined): value is string {
  if (!value) return false
  if (!value.startsWith("/")) return false
  if (value.startsWith("//")) return false
  return SAFE_NEXT_PREFIXES.some((p) => value === p || value.startsWith(`${p}/`) || value.startsWith(`${p}?`))
}

export function getAuthCopy(action?: string | null) {
  if (action && action in COPY) return COPY[action as AuthAction]
  return FALLBACK
}

export function buildAuthHref(target: "signin" | "signup", next: string, action?: AuthAction) {
  const params = new URLSearchParams()
  params.set("next", next)
  if (action) params.set("action", action)
  return `/${target}?${params.toString()}`
}

/**
 * Mark a destination as "after sign-in" so dual-mode public pages
 * (like /explore and /about) render the authenticated AppHeader.
 *
 * Adds `as=user` if it's missing; preserves any other query params.
 */
export function markAuthedNext(next: string): string {
  const [path, query = ""] = next.split("?")
  const params = new URLSearchParams(query)
  if (!params.has("as")) params.set("as", "user")
  const qs = params.toString()
  return qs ? `${path}?${qs}` : path
}
