import { apiFetch } from "@/lib/api/client"
import { adaptRecommendationItem } from "@/lib/api/adapters/trip-creation"
import type {
  BackendRecommendationItem,
  BackendRecommendationRun,
  BackendTripCreationSession,
  RecommendationCardDisplay,
} from "@/lib/api/types"

type RecommendationPayload = {
  run: BackendRecommendationRun
  items: BackendRecommendationItem[]
}

export async function generateRecommendations(sessionId: string, selectedIds: string[] = []) {
  const body = await apiFetch<RecommendationPayload>(
    `/api/trip-creation-sessions/${encodeURIComponent(sessionId)}/recommendations`,
    { method: "POST" },
  )
  return {
    run: body.run,
    items: body.items.map((item) => adaptRecommendationItem(item, selectedIds)),
  }
}

export async function getSessionRecommendationRuns(sessionId: string, cookieHeader?: string) {
  return apiFetch<{ runs: BackendRecommendationRun[] }>(
    `/api/trip-creation-sessions/${encodeURIComponent(sessionId)}/recommendations`,
    { cookieHeader },
  )
}

export async function selectRecommendations(sessionId: string, recommendationItemIds: string[]) {
  return apiFetch<{ session: BackendTripCreationSession; selected_recommendation_ids: string[] }>(
    `/api/trip-creation-sessions/${encodeURIComponent(sessionId)}/selected-recommendations`,
    {
      method: "POST",
      body: JSON.stringify({ recommendation_item_ids: recommendationItemIds }),
    },
  )
}

export type { RecommendationCardDisplay }
