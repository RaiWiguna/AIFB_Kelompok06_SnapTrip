import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { AppFooter } from "@/components/app-footer"
import { AppHeader } from "@/components/app-header"
import { TripBackLink } from "@/components/trip-back-link"
import { TripBudgetExplorer } from "@/components/trip-budget-explorer"
import { ApiError } from "@/lib/api/client"
import { getTripPlanDetail } from "@/lib/api/trip-plans"

export default async function TripBudgetPage({ params }: { params: Promise<{ id: string }> }) {
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

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-6 pb-20 pt-8 md:px-10">
        <TripBackLink tripId={id} />

        <header className="mt-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="font-display text-[clamp(2rem,3vw,2.8rem)] leading-[1.05] tracking-[-0.02em] text-primary">
              Budget Plan
            </h1>
            <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-foreground/75">
              Estimated budget for {t.durationDays} days, {t.travelers ?? "2–8"} travelers. Costs can vary depending on
              season and preferences.
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
        />
      </main>

      <AppFooter />
    </div>
  )
}
