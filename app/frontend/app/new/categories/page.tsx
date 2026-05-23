import Image from "next/image"
import Link from "next/link"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { Sparkles } from "lucide-react"
import { AuthenticatedAppHeader } from "@/components/authenticated-app-header"
import { AppFooter } from "@/components/app-footer"
import { CategoryIcon } from "@/components/category-icon"
import { StepIndicator, NEW_TRIP_STEPS } from "@/components/step-indicator"
import { ApiError } from "@/lib/api/client"
import { getTripCreationSession } from "@/lib/api/trip-creation"
import { CategoryConfirmationPanel } from "./category-confirmation-panel"

export default async function CategoriesStepPage({
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
      redirect("/signin?next=%2Fnew%2Fcategories&action=plan")
    }
    if (error instanceof ApiError && error.status === 404) {
      redirect("/new")
    }
    throw error
  }

  if (!tripSession.classification) {
    redirect(`/new/review-images?session=${tripSession.id}`)
  }

  const defaults = tripSession.confirmedCategories.length
    ? tripSession.confirmedCategories
    : tripSession.classification.scores.filter((score) => score.value >= 20).slice(0, 3).map((score) => score.id)

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AuthenticatedAppHeader active="new" next="/new/categories" action="plan" />
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-6 pb-20 pt-6 md:px-10">
        <div className="mb-2 flex items-center gap-2 text-[12px] text-muted-foreground">
          <Link href="/" className="hover:text-primary">
            Home
          </Link>
          <span aria-hidden>/</span>
          <Link href="/new" className="hover:text-primary">
            New trip
          </Link>
          <span aria-hidden>/</span>
          <span className="text-foreground">Categories</span>
        </div>

        <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Step 2 - Categories</div>
            <h1 className="mt-3 font-display text-[clamp(2.2rem,4vw,3.4rem)] leading-[1.04] tracking-[-0.02em] text-primary text-balance">
              Confirm what your <br /> images point to.
            </h1>
            <p className="mt-3 max-w-xl text-[14.5px] leading-relaxed text-foreground/75">
              The classifier is assistive. Adjust selections before recommendations are built - confirmed categories
              shape the rest of the plan.
            </p>
          </div>
          <StepIndicator current={2} steps={NEW_TRIP_STEPS} />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
          <section>
            <h2 className="font-display text-[20px] tracking-tight text-primary">Per-image predictions</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Each image is scored independently. Confidence is a hint, not a guarantee.
            </p>
            <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {tripSession.classification.perImage.map((prediction) => (
                <li key={prediction.imageId} className="overflow-hidden rounded-2xl bg-card ring-1 ring-border">
                  <div className="relative aspect-[16/10]">
                    <Image
                      src={prediction.image?.url || "/placeholder.svg"}
                      alt=""
                      fill
                      sizes="50vw"
                      className="object-cover"
                      unoptimized
                    />
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-card/95 px-2.5 py-1 text-[11.5px] font-medium text-foreground ring-1 ring-border">
                      <CategoryIcon id={prediction.topCategory} className="text-primary" />
                      {prediction.topLabel}
                    </span>
                    <span className="absolute right-3 top-3 inline-flex rounded-full bg-card/95 px-2.5 py-1 text-[11.5px] font-medium text-primary ring-1 ring-border">
                      {prediction.confidenceLabel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <span className="text-[12.5px] text-muted-foreground">Predicted: {prediction.topLabel}</span>
                    <span className="text-[12.5px] font-medium text-primary">{prediction.image?.sourceLabel}</span>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-6 rounded-2xl bg-card p-4 ring-1 ring-border">
              <h3 className="font-display text-[18px] tracking-tight text-primary">Manual override</h3>
              <p className="mt-1 text-[12.5px] text-muted-foreground">
                Toggle which canonical categories should drive your recommendations.
              </p>
              <CategoryConfirmationPanel sessionId={tripSession.id} defaults={defaults} />
              <p className="mt-3 text-[12px] text-muted-foreground">
                Only canonical category IDs move forward. Manual confirmation overrides classifier confidence.
              </p>
            </div>
          </section>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl bg-card p-6 ring-1 ring-border shadow-[0_30px_80px_-30px_rgba(29,36,32,0.35)]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 text-[15px] font-semibold">
                    Trip preferences <Sparkles className="size-3.5 text-accent" aria-hidden />
                  </div>
                  <div className="text-[12.5px] text-muted-foreground">Aggregated across your images</div>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {tripSession.classification.scores.map((score) => (
                  <div key={score.id} className="grid grid-cols-[28px_1fr_42px] items-center gap-3">
                    <CategoryIcon id={score.id} className="text-primary" />
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[13.5px] font-medium">{score.label}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${score.value}%` }} aria-hidden />
                      </div>
                    </div>
                    <span className="text-right text-[12px] text-muted-foreground">{score.value}%</span>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-start gap-2 rounded-xl bg-secondary p-3 text-[12.5px] text-foreground/80 ring-1 ring-border">
                <Sparkles className="mt-0.5 size-3.5 text-accent" aria-hidden />
                <span>We&apos;ll use these preferences to shape your recommended trip.</span>
              </div>
            </div>
          </aside>
        </div>
      </main>
      <AppFooter />
    </div>
  )
}
