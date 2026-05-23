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
