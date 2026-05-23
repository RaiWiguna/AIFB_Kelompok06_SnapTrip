import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { BookOpen } from "lucide-react"
import { AppFooter } from "@/components/app-footer"
import { AuthenticatedAppHeader } from "@/components/authenticated-app-header"
import { TripBackLink } from "@/components/trip-back-link"
import { TripMemoBody } from "@/components/trip-memo-body"
import { ApiError } from "@/lib/api/client"
import { getPlannerPreview } from "@/lib/api/planner-preview"

export default async function PlannerMemoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieHeader = (await cookies()).toString()
  let preview
  try {
    preview = await getPlannerPreview(id, cookieHeader)
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect(`/signin?next=${encodeURIComponent(`/plan/${id}/memo`)}&action=trips`)
    }
    if (error instanceof ApiError && error.status === 404) {
      notFound()
    }
    throw error
  }
  const detail = preview.detail

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AuthenticatedAppHeader active="plan" next={`/plan/${id}/memo`} action="trips" />

      <main className="mx-auto w-full max-w-[920px] flex-1 px-6 pb-20 pt-8 md:px-10">
        <div className="flex items-center justify-between gap-4">
          <TripBackLink href={`/plan/${id}`} label="Back to planner" />
          <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <BookOpen className="size-3.5" aria-hidden />
            {detail.memoItems} items · {detail.memoSource}
          </span>
        </div>

        <header className="mt-6">
          <p className="text-[12.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Trip Memo · Draft</p>
          <h1 className="mt-2 font-display text-[clamp(2rem,3vw,2.8rem)] leading-[1.05] tracking-[-0.02em] text-primary">
            {preview.title}
          </h1>
          <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-foreground/75">
            Memo preview rendered from the assistant&apos;s working draft. Continue chatting in the planner to add notes,
            tweak references, or replace photos.
          </p>
        </header>

        <TripMemoBody detail={detail} />
      </main>

      <AppFooter />
    </div>
  )
}
