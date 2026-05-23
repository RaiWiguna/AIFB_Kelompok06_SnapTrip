import { apiFetch } from "@/lib/api/client"
import { adaptCurrentUser, adaptMyTrip } from "@/lib/api/adapters/trips"
import type { AccountSummaryDisplay, BackendUser } from "@/lib/api/types"

type AccountSummaryResponse = {
  user: BackendUser
  stats: {
    owned_trips: number
    joined_trips: number
    collections: number
    liked_trips: number
  }
  recent_owned_trips: Parameters<typeof adaptMyTrip>[0][]
  joined_trips: Parameters<typeof adaptMyTrip>[0][]
}

export async function getAccountSummary(cookieHeader?: string): Promise<AccountSummaryDisplay> {
  const body = await apiFetch<AccountSummaryResponse>("/api/account/summary", { cookieHeader })
  return {
    user: adaptCurrentUser(body.user),
    stats: {
      trips: body.stats.owned_trips,
      joined: body.stats.joined_trips,
      collections: body.stats.collections,
      likes: body.stats.liked_trips,
    },
    recentOwnedTrips: body.recent_owned_trips.map(adaptMyTrip),
    joinedTrips: body.joined_trips.map(adaptMyTrip),
  }
}

