import { notFound } from "next/navigation"
import { AppFooter } from "@/components/app-footer"
import { AppHeader } from "@/components/app-header"
import { TripBackLink } from "@/components/trip-back-link"
import { TripBudgetExplorer } from "@/components/trip-budget-explorer"
import { getPlanSession, TRIP_DETAIL } from "@/lib/data"
import { getTripDetailFull } from "@/lib/trip-detail"

export default async function PlannerBudgetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = getPlanSession(id)
  if (!session) notFound()
  const t = TRIP_DETAIL
  const detail = getTripDetailFull(id)

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader active="plan" />

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-6 pb-20 pt-8 md:px-10">
        <TripBackLink href={`/plan/${id}`} label="Back to planner" />

        <header className="mt-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-[12.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
              Budget Plan · Draft
            </p>
            <h1 className="mt-2 font-display text-[clamp(2rem,3vw,2.8rem)] leading-[1.05] tracking-[-0.02em] text-primary">
              {session.title}
            </h1>
            <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-foreground/75">
              Estimated budget for {t.durationDays} days, {t.travelers ?? "2–8"} travelers. Numbers update as you
              continue planning with the assistant.
            </p>
          </div>
          <div className="rounded-2xl bg-card px-4 py-3 ring-1 ring-border/70">
            <p className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">Currency</p>
            <p className="mt-1 text-[13px] font-medium text-foreground">All amounts in Indonesian Rupiah (IDR)</p>
          </div>
        </header>

        <TripBudgetExplorer
          tripId={id}
          categories={detail.budgetCategories}
          daily={detail.budgetDaily}
          totalLabel={`per person · ${t.durationDays} days`}
          totalAmount={t.budget.total}
          backHref={`/plan/${id}`}
          backLabel="Back to planner"
        />
      </main>

      <AppFooter />
    </div>
  )
}
