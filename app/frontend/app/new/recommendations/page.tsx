import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { ApiError } from "@/lib/api/client"
import { getTripCreationSession } from "@/lib/api/trip-creation"
import { requireAppHeaderUser } from "@/lib/server-auth"
import { RecommendationsStepClient } from "./recommendations-step-client"

export default async function RecommendationsStepPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>
}) {
  const { session } = await searchParams
  if (!session) redirect("/new")
  const cookieHeader = (await cookies()).toString()
  const headerUser = await requireAppHeaderUser("/new/recommendations", "plan", cookieHeader)

  let tripSession
  try {
    tripSession = await getTripCreationSession(session, cookieHeader)
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

  return <RecommendationsStepClient initialSession={tripSession} headerUser={headerUser} />
}
