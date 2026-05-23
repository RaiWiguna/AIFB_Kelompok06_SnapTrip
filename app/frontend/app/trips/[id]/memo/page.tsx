import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { BookOpen } from "lucide-react"
import { AppFooter } from "@/components/app-footer"
import { AppHeader } from "@/components/app-header"
import { TripBackLink } from "@/components/trip-back-link"
import { TripMemoBody } from "@/components/trip-memo-body"
import { ApiError } from "@/lib/api/client"
import { getTripPlanDetail } from "@/lib/api/trip-plans"

export default async function TripMemoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let trip
  try {
    trip = await getTripPlanDetail(id, (await cookies()).toString())
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound()
    if (error instanceof ApiError && error.status === 403) redirect("/forbidden")
    throw error
  }
  const t = trip.summary
  const detail = trip.detail

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader active="trips" />

      <main className="mx-auto w-full max-w-[920px] flex-1 px-6 pb-20 pt-8 md:px-10">
        <div className="flex items-center justify-between gap-4">
          <TripBackLink tripId={id} />
          <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <BookOpen className="size-3.5" aria-hidden />
            {detail.memoItems} items · {detail.memoSource}
          </span>
        </div>

        <header className="mt-6">
          <p className="text-[12.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Trip Memo</p>
          <h1 className="mt-2 font-display text-[clamp(2rem,3vw,2.8rem)] leading-[1.05] tracking-[-0.02em] text-primary">
            {t.title}
          </h1>
          <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-foreground/75">
            Notes, references, and saved photos from the planning process. Treat this as a working scrapbook — quotes,
            packing lists, and links live alongside the visual moodboard.
          </p>
        </header>

        <TripMemoBody detail={detail} />
      </main>

      <AppFooter />
    </div>
  )
}
