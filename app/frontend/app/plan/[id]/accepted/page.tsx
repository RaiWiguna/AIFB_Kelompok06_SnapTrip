import Link from "next/link"
import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { ArrowRight, Bookmark, Calendar, CheckCircle2, MapPin, Share2, Wallet } from "lucide-react"

import { AppFooter } from "@/components/app-footer"
import { AuthenticatedAppHeader } from "@/components/authenticated-app-header"
import { AcceptedHeroBadge } from "@/components/planner/accepted-hero-badge"
import { ApiError } from "@/lib/api/client"
import { getPlannerSession } from "@/lib/api/planner-sessions"

export default async function PlanAcceptedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieHeader = (await cookies()).toString()
  let preview
  try {
    preview = await getPlannerSession(id, cookieHeader)
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect(`/signin?next=${encodeURIComponent(`/plan/${id}/accepted`)}&action=trips`)
    }
    if (error instanceof ApiError && error.status === 404) {
      notFound()
    }
    throw error
  }
  const detail = preview.detail

  const summary = [
    {
      icon: <MapPin className="size-4" aria-hidden />,
      label: "Destinations",
      value: `${detail.destinations.length} stops`,
    },
    {
      icon: <Calendar className="size-4" aria-hidden />,
      label: "Duration",
      value: `${detail.itinerary.length} days`,
    },
    {
      icon: <Wallet className="size-4" aria-hidden />,
      label: "Budget",
      value: preview.budgetTotalAmount,
    },
    {
      icon: <Bookmark className="size-4" aria-hidden />,
      label: "Memo items",
      value: `${detail.memoItems} previewed`,
    },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AuthenticatedAppHeader active="plan" next={`/plan/${id}/accepted`} action="trips" />

      <main className="mx-auto w-full max-w-[1180px] flex-1 px-6 pb-20 pt-8 md:px-10">
        <section className="relative overflow-hidden rounded-3xl bg-secondary/60 px-6 py-10 ring-1 ring-border/70 md:px-10 md:py-14">
          <AcceptedHeroBadge />

          <div className="relative grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-primary ring-1 ring-primary/20">
                <CheckCircle2 className="size-3.5" aria-hidden />
                Planner accepted
              </span>
              <h1 className="mt-4 max-w-2xl font-display text-[clamp(2.2rem,3.6vw,3.4rem)] leading-[1.02] tracking-[-0.02em] text-primary">
                {preview.title}
              </h1>
              <p className="mt-3 max-w-xl text-[14.5px] leading-relaxed text-foreground/75">
                Your planner documents are valid and ready to be saved as a Trip Plan with the selected visibility.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-2">
                <Link
                  href={`/plan/${id}`}
                  className="group inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-[13.5px] font-medium text-primary-foreground transition-colors hover:bg-[#0b2a25]"
                >
                  Back to planner
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
                <button
                  type="button"
                  disabled
                  className="inline-flex cursor-not-allowed items-center gap-2 rounded-full bg-card px-4 py-2.5 text-[13px] font-medium text-muted-foreground ring-1 ring-border/70"
                >
                  <Share2 className="size-4" aria-hidden />
                  Share
                </button>
                <span className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2.5 text-[13px] font-medium text-muted-foreground ring-1 ring-border/70">
                  {preview.status === "accepted" ? "Accepted" : "Draft"}
                </span>
              </div>
            </div>

            <div className="hidden md:block">
              <div className="relative size-[180px] shrink-0">
                <div className="absolute inset-0 rounded-full bg-primary/10" />
                <div className="absolute inset-3 rounded-full bg-card ring-1 ring-border/70" />
                <div className="absolute inset-0 grid place-items-center">
                  <CheckCircle2 className="size-16 text-primary" strokeWidth={1.4} aria-hidden />
                </div>
              </div>
            </div>
          </div>

          <ul className="relative mt-8 grid grid-cols-2 gap-2 md:grid-cols-4">
            {summary.map((s) => (
              <li key={s.label} className="rounded-2xl bg-card px-4 py-3 ring-1 ring-border/70">
                <div className="flex items-center gap-2 text-foreground/70">
                  <span className="grid size-7 place-items-center rounded-lg bg-secondary text-primary ring-1 ring-border/70">
                    {s.icon}
                  </span>
                  <span className="text-[11.5px] font-medium uppercase tracking-[0.06em]">{s.label}</span>
                </div>
                <p className="mt-2 font-display text-[18px] leading-tight tracking-tight text-primary">{s.value}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <PreviewCard
            href={`/plan/${id}/memo`}
            icon={<Bookmark className="size-4" aria-hidden />}
            label="Trip Memo"
            heading={detail.memoCaption}
            footer={`${detail.memoItems} items - ${detail.galleryThumbs.length + 1} photos`}
            tile={detail.memoTiles[0]?.src}
          />
          <PreviewCard
            href={`/plan/${id}/itinerary`}
            icon={<Calendar className="size-4" aria-hidden />}
            label="Full Itinerary"
            heading={`${detail.itinerary.length} days, ${detail.destinations.length} stops`}
            footer={`Day 1 - ${detail.itinerary[0]?.title ?? "Arrive"} - Day ${detail.itinerary.length} - ${
              detail.itinerary[detail.itinerary.length - 1]?.title ?? "Depart"
            }`}
          />
          <PreviewCard
            href={`/plan/${id}/budget`}
            icon={<Wallet className="size-4" aria-hidden />}
            label="Budget Plan"
            heading={preview.budgetTotalAmount}
            footer={`${detail.budgetCategories.length} categories - ${detail.budgetDaily.length}-day breakdown`}
          />
        </section>

        <section className="mt-8 rounded-3xl bg-secondary/50 p-6 ring-1 ring-border/70 md:p-8">
          <h2 className="font-display text-[22px] tracking-tight text-primary">What happens next</h2>
          <ol className="mt-4 grid gap-3 md:grid-cols-3">
            <NextStep
              n={1}
              title="Trip Plan saved"
              body="Acceptance creates a persisted Trip Plan from the latest valid documents."
            />
            <NextStep
              n={2}
              title="Keep refining"
              body="Return to the planner to chat with the agent and revise the documents."
            />
            <NextStep
              n={3}
              title="Share when ready"
              body="Use private, invite-only, or public visibility for the accepted plan."
            />
          </ol>
        </section>
      </main>

      <AppFooter />
    </div>
  )
}

function PreviewCard({
  href,
  icon,
  label,
  heading,
  footer,
  tile,
}: {
  href: string
  icon: React.ReactNode
  label: string
  heading: string
  footer: string
  tile?: string
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-border/70 transition-shadow hover:shadow-sm"
    >
      {tile ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={tile} alt="" className="h-32 w-full object-cover" />
      ) : null}
      <div className="flex flex-1 flex-col p-4">
        <div className="inline-flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.06em] text-foreground/70">
          <span className="grid size-6 place-items-center rounded-md bg-secondary text-primary ring-1 ring-border/70">
            {icon}
          </span>
          {label}
        </div>
        <p className="mt-2 line-clamp-2 font-display text-[18px] leading-tight tracking-tight text-primary">
          {heading}
        </p>
        <p className="mt-1 line-clamp-2 text-[12.5px] text-muted-foreground">{footer}</p>
        <span className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-foreground/80 transition-colors group-hover:text-primary">
          Open
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </div>
    </Link>
  )
}

function NextStep({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="rounded-2xl bg-card p-4 ring-1 ring-border/70">
      <div className="inline-flex size-7 items-center justify-center rounded-full bg-primary/10 font-mono text-[12px] font-medium text-primary ring-1 ring-primary/20">
        {n}
      </div>
      <p className="mt-3 font-display text-[16px] leading-tight tracking-tight text-primary">{title}</p>
      <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{body}</p>
    </li>
  )
}
