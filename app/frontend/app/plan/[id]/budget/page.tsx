import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { AppFooter } from "@/components/app-footer"
import { AuthenticatedAppHeader } from "@/components/authenticated-app-header"
import { TripBackLink } from "@/components/trip-back-link"
import { TripBudgetExplorer } from "@/components/trip-budget-explorer"
import { ApiError } from "@/lib/api/client"
import { getPlannerPreview } from "@/lib/api/planner-preview"

export default async function PlannerBudgetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieHeader = (await cookies()).toString()
  let preview
  try {
    preview = await getPlannerPreview(id, cookieHeader)
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect(`/signin?next=${encodeURIComponent(`/plan/${id}/budget`)}&action=trips`)
    }
    if (error instanceof ApiError && error.status === 404) {
      notFound()
    }
    throw error
  }
  const detail = preview.detail

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AuthenticatedAppHeader active="plan" next={`/plan/${id}/budget`} action="trips" />

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-6 pb-20 pt-8 md:px-10">
        <TripBackLink href={`/plan/${id}`} label="Back to planner" />

        <header className="mt-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-[12.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
              Budget Plan - Draft
            </p>
            <h1 className="mt-2 font-display text-[clamp(2rem,3vw,2.8rem)] leading-[1.05] tracking-[-0.02em] text-primary">
              {preview.title}
            </h1>
            <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-foreground/75">
              Estimated budget for {detail.itinerary.length} days, 2-8 travelers. Numbers update as you continue
              planning with the assistant.
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
          totalLabel={preview.budgetTotalLabel}
          totalAmount={preview.budgetTotalAmount}
          backHref={`/plan/${id}`}
          backLabel="Back to planner"
        />
      </main>

      <AppFooter />
    </div>
  )
}
