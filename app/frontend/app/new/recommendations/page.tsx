import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { ApiError } from "@/lib/api/client"
import { getTripCreationSession } from "@/lib/api/trip-creation"
import { RecommendationsStepClient } from "./recommendations-step-client"

export default async function RecommendationsStepPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>
}) {
  const { session } = await searchParams
  if (!session) redirect("/new")

  let tripSession
  try {
    tripSession = await getTripCreationSession(session, (await cookies()).toString())
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect("/signin?next=%2Fnew%2Frecommendations&action=plan")
    }
    if (error instanceof ApiError && error.status === 404) {
      redirect("/new")
    }
    throw error
  }

  if (!tripSession.confirmedCategories.length) {
    redirect(`/new/categories?session=${tripSession.id}`)
  }

  return <RecommendationsStepClient initialSession={tripSession} />
}
