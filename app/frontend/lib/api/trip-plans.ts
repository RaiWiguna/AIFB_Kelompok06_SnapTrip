import { apiFetch } from "@/lib/api/client"
import { adaptTripDetail } from "@/lib/api/adapters/trip-detail"
import type { BackendTripDetail } from "@/lib/api/types"

type TripDetailResponse = {
  detail: BackendTripDetail
}

export async function getTripPlanDetail(tripPlanId: string, cookieHeader?: string) {
  const body = await apiFetch<TripDetailResponse>(
    `/api/trip-plans/${encodeURIComponent(tripPlanId)}/detail`,
    { cookieHeader },
  )
  return adaptTripDetail(body.detail)
}

export async function updateTripVisibility(
  tripPlanId: string,
  visibility: "private" | "invite_only" | "public",
) {
  return apiFetch<{ trip_plan: { id: string; visibility: "private" | "invite_only" | "public" } }>(
    `/api/trip-plans/${encodeURIComponent(tripPlanId)}/visibility`,
    {
      method: "PATCH",
      body: JSON.stringify({ visibility }),
    },
  )
}
