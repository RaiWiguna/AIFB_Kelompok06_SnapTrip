import { apiFetch } from "@/lib/api/client"
import { adaptTripCreationSession } from "@/lib/api/adapters/trip-creation"
import type {
  BackendClassification,
  BackendTripCreationSession,
  BackendUploadedImage,
  TripCreationSessionDisplay,
} from "@/lib/api/types"
import type { CategoryId } from "@/lib/categories"

type SessionResponse = { session: BackendTripCreationSession }

export async function createTripCreationSession(source = "upload") {
  const body = await apiFetch<SessionResponse>("/api/trip-creation-sessions", {
    method: "POST",
    body: JSON.stringify({ source }),
  })
  return adaptTripCreationSession(body.session)
}

export async function getTripCreationSession(
  sessionId: string,
  cookieHeader?: string,
): Promise<TripCreationSessionDisplay> {
  const body = await apiFetch<SessionResponse>(`/api/trip-creation-sessions/${encodeURIComponent(sessionId)}`, {
    cookieHeader,
  })
  return adaptTripCreationSession(body.session)
}

export async function uploadTripImages(sessionId: string, files: File[]) {
  const form = new FormData()
  for (const file of files) {
    form.append("files", file)
  }
  const body = await apiFetch<{ session: BackendTripCreationSession; images: BackendUploadedImage[] }>(
    `/api/trip-creation-sessions/${encodeURIComponent(sessionId)}/images`,
    {
      method: "POST",
      body: form,
    },
  )
  return body
}

export async function addTripSourceImages(sessionId: string, imageIds: string[]) {
  const body = await apiFetch<SessionResponse>(
    `/api/trip-creation-sessions/${encodeURIComponent(sessionId)}/source-images`,
    {
      method: "POST",
      body: JSON.stringify(imageIds),
    },
  )
  return adaptTripCreationSession(body.session)
}

export async function classifyTripCreationSession(sessionId: string) {
  const body = await apiFetch<{ classification: BackendClassification }>(
    `/api/trip-creation-sessions/${encodeURIComponent(sessionId)}/classify`,
    { method: "POST" },
  )
  return body.classification
}

export async function confirmTripCategories(sessionId: string, categories: CategoryId[]) {
  const body = await apiFetch<SessionResponse>(
    `/api/trip-creation-sessions/${encodeURIComponent(sessionId)}/confirm-categories`,
    {
      method: "POST",
      body: JSON.stringify({ categories }),
    },
  )
  return adaptTripCreationSession(body.session)
}
