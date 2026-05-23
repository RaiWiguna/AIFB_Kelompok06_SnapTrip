import { apiFetch } from "@/lib/api/client"
import { adaptTripCard } from "@/lib/api/adapters/trips"
import type { BackendTripCard, TripCardDisplay } from "@/lib/api/types"

export async function getLikedTripPlans(cookieHeader?: string): Promise<TripCardDisplay[]> {
  const body = await apiFetch<{ items: BackendTripCard[] }>("/api/likes/trip-plans", { cookieHeader })
  return body.items.map(adaptTripCard)
}

export async function likeTripPlan(tripId: string) {
  return apiFetch<{ liked: true }>(`/api/trip-plans/${tripId}/like`, { method: "POST" })
}

export async function unlikeTripPlan(tripId: string) {
  return apiFetch<{ liked: false }>(`/api/trip-plans/${tripId}/like`, { method: "DELETE" })
}

