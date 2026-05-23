import Image from "next/image"
import Link from "next/link"
import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { AppFooter } from "@/components/app-footer"
import { AuthenticatedAppHeader } from "@/components/authenticated-app-header"
import { PlannerWorkspace } from "@/components/planner/planner-workspace"
import { ApiError } from "@/lib/api/client"
import { getPlannerPreview } from "@/lib/api/planner-preview"

export default async function PlannerSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieHeader = (await cookies()).toString()
  let preview
  try {
    preview = await getPlannerPreview(id, cookieHeader)
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect(`/signin?next=${encodeURIComponent(`/plan/${id}`)}&action=trips`)
    }
    if (error instanceof ApiError && error.status === 404) {
      notFound()
    }
    throw error
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[700px] opacity-40">
        <Image src="/landing/bali-coastal-pano.png" alt="" fill sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/85 to-background" />
      </div>

      <AuthenticatedAppHeader active="plan" next={`/plan/${id}`} action="trips" />

      <main className="mx-auto w-full max-w-[1480px] flex-1 px-6 pb-24 pt-4 md:px-10">
        <nav aria-label="Breadcrumb" className="mb-6 text-[12.5px] text-muted-foreground">
          <Link href="/trips" className="hover:text-primary">
            My trips
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{preview.title}</span>
        </nav>

        <PlannerWorkspace
          tripId={preview.sessionId}
          title={preview.title}
          initialState={preview.workspace}
          acceptanceReason={preview.acceptance.reason}
        />
      </main>

      <AppFooter />
    </div>
  )
}
