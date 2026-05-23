import { apiFetch } from "@/lib/api/client"
import { adaptTripCard } from "@/lib/api/adapters/trips"
import type { CategoryId } from "@/lib/categories"
import type { BackendTripCard, ExploreTripDisplay } from "@/lib/api/types"

type ExploreResponse = { items: BackendTripCard[]; next_cursor: string | null }

export async function getExploreTrips({
  categories = [],
  cookieHeader,
  limit = 20,
}: {
  categories?: CategoryId[]
  cookieHeader?: string
  limit?: number
} = {}): Promise<ExploreTripDisplay[]> {
  const params = new URLSearchParams()
  categories.forEach((category) => params.append("category", category))
  params.set("limit", String(limit))
  const body = await apiFetch<ExploreResponse>(`/api/explore?${params.toString()}`, { cookieHeader })
  return body.items.map(adaptTripCard)
}
