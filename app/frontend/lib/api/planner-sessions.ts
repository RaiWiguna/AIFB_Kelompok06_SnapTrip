import { apiFetch } from "@/lib/api/client"
import { adaptPlannerSession } from "@/lib/api/adapters/planner-preview"
import type {
  BackendPlannerEvent,
  BackendPlannerSessionResponse,
  PlannerSessionDisplay,
} from "@/lib/api/types"

export type PlannerStartPayload = {
  recommendation_item_id: string
  travel_start_date: string
  travel_end_date: string
  traveler_count: number
}

export async function createPlannerSessionFromTripCreation(
  tripCreationSessionId: string,
  payload: PlannerStartPayload,
): Promise<PlannerSessionDisplay> {
  const body = await apiFetch<BackendPlannerSessionResponse>(
    `/api/planner-sessions/from-trip-creation/${encodeURIComponent(tripCreationSessionId)}`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  )
  return adaptPlannerSession(body)
}

export async function getPlannerSession(
  plannerSessionId: string,
  cookieHeader?: string,
): Promise<PlannerSessionDisplay> {
  const body = await apiFetch<BackendPlannerSessionResponse>(
    `/api/planner-sessions/${encodeURIComponent(plannerSessionId)}`,
    { cookieHeader },
  )
  return adaptPlannerSession(body)
}

export async function sendPlannerMessage(plannerSessionId: string, text: string): Promise<PlannerSessionDisplay> {
  const body = await apiFetch<BackendPlannerSessionResponse>(
    `/api/planner-sessions/${encodeURIComponent(plannerSessionId)}/messages`,
    {
      method: "POST",
      body: JSON.stringify({ text }),
    },
  )
  return adaptPlannerSession(body)
}

export async function getPlannerEvents(plannerSessionId: string, after = 0): Promise<BackendPlannerEvent[]> {
  const body = await apiFetch<{ events: BackendPlannerEvent[] }>(
    `/api/planner-sessions/${encodeURIComponent(plannerSessionId)}/events?after=${after}`,
  )
  return body.events
}

export async function acceptPlannerSession(
  plannerSessionId: string,
  visibility: "private" | "invite_only" | "public",
): Promise<{ trip_plan: { id: string } }> {
  return apiFetch<{ trip_plan: { id: string } }>(
    `/api/planner-sessions/${encodeURIComponent(plannerSessionId)}/accept`,
    {
      method: "POST",
      body: JSON.stringify({ visibility }),
    },
  )
}
