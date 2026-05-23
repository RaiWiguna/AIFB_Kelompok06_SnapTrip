import { apiFetch } from "@/lib/api/client"
import { adaptPlannerPreview } from "@/lib/api/adapters/planner-preview"
import type { BackendPlannerPreview, PlannerPreviewDisplay } from "@/lib/api/types"

type PlannerPreviewResponse = {
  preview: BackendPlannerPreview
}

export async function getPlannerPreview(
  sessionId: string,
  cookieHeader?: string,
): Promise<PlannerPreviewDisplay> {
  const body = await apiFetch<PlannerPreviewResponse>(
    `/api/planner-preview/${encodeURIComponent(sessionId)}`,
    { cookieHeader },
  )
  return adaptPlannerPreview(body.preview)
}
