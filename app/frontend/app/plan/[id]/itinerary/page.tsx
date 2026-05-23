import { notFound } from "next/navigation"
import { AppFooter } from "@/components/app-footer"
import { AppHeader } from "@/components/app-header"
import { TripBackLink } from "@/components/trip-back-link"
import { TripItineraryBody } from "@/components/trip-itinerary-body"
import { getPlanSession } from "@/lib/data"
import { getTripDetailFull } from "@/lib/trip-detail"

export default async function PlannerItineraryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = getPlanSession(id)
  if (!session) notFound()
  const detail = getTripDetailFull(id)

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader active="plan" />

      <main className="mx-auto w-full max-w-[1180px] flex-1 px-6 pb-20 pt-8 md:px-10">
        <div className="flex items-center justify-between gap-4">
          <TripBackLink href={`/plan/${id}`} label="Back to planner" />
          <span className="text-[12px] text-muted-foreground">
            {detail.itinerary.length} days · drafted by Plan Assistant
          </span>
        </div>

        <header className="mt-6">
          <p className="text-[12.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
            Full Itinerary · Draft
          </p>
          <h1 className="mt-2 max-w-2xl font-display text-[clamp(2rem,3vw,2.8rem)] leading-[1.05] tracking-[-0.02em] text-primary">
            {session.title}
          </h1>
          <p className="mt-3 max-w-xl text-[14.5px] leading-relaxed text-foreground/75">
            Day-by-day preview from the planner draft. Return to the conversation to revise routes, swap stays, or
            tweak meals.
          </p>
        </header>

        <TripItineraryBody detail={detail} />
      </main>

      <AppFooter />
    </div>
  )
}
