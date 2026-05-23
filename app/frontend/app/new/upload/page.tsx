import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { ApiError } from "@/lib/api/client"
import { getTripCreationSession } from "@/lib/api/trip-creation"
import { requireAppHeaderUser } from "@/lib/server-auth"
import { UploadStepClient } from "./upload-step-client"

export default async function UploadStepPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>
}) {
  const { session } = await searchParams
  const cookieHeader = (await cookies()).toString()
  const headerUser = await requireAppHeaderUser("/new/upload", "plan", cookieHeader)
  let initialSession = null
  if (session) {
    try {
      initialSession = await getTripCreationSession(session, cookieHeader)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        redirect("/signin?next=%2Fnew%2Fupload&action=plan")
      }
      if (error instanceof ApiError && error.status === 404) {
        redirect("/new/upload")
      }
      throw error
    }
  }

  return <UploadStepClient initialSession={initialSession} headerUser={headerUser} />
}
