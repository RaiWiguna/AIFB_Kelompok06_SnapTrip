import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Calendar, CheckCircle2, Globe2, Lock, ShieldCheck, Users } from "lucide-react"
import { AppHeader } from "@/components/app-header"
import { AppFooter } from "@/components/app-footer"
import { StepIndicator, NEW_TRIP_STEPS } from "@/components/step-indicator"

const REVIEW_PREVIEW = {
  id: "planner-preview",
  title: "Planner preview boundary",
  range: "Generated after selected recommendations",
  memoText: {
    overview: "Preview memo data is rendered for review only and is not persisted as trip_memo.v1.",
  },
  itinerary: [
    { day: 1, name: "Selected destination", cover: "/landing/diamond-beach.png" },
    { day: 2, name: "Draft route", cover: "/landing/bali-coastal-pano.png" },
    { day: 3, name: "Budget estimate", cover: "/landing/bromo-tengger.png" },
  ],
  budgetDoc: {
    total: "Preview only",
    perPerson: "Not accepted",
    estimateNote: "Acceptance, invites, participants, and persisted documents remain deferred.",
  },
}

export default function ReviewStepPage() {
  const s = REVIEW_PREVIEW
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader active="new" />
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-6 pb-24 pt-6 md:px-10">
        <div className="mb-2 flex items-center gap-2 text-[12px] text-muted-foreground">
          <Link href="/" className="hover:text-primary">
            Home
          </Link>
          <span aria-hidden>/</span>
          <Link href="/new" className="hover:text-primary">
            New trip
          </Link>
          <span aria-hidden>/</span>
          <span className="text-foreground">Review</span>
        </div>

        <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Step 5 - Final review</div>
            <h1 className="mt-3 font-display text-[clamp(2.2rem,4vw,3.4rem)] leading-[1.04] tracking-[-0.02em] text-primary text-balance">
              Review your preview <br /> before the full planner.
            </h1>
            <p className="mt-3 max-w-xl text-[14.5px] leading-relaxed text-foreground/75">
              The layout stays ready for acceptance, but this integration step only previews deterministic Trip Memo,
              Full Itinerary, and Budget Plan data.
            </p>
          </div>
          <StepIndicator current={5} steps={NEW_TRIP_STEPS} />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
          <section>
            <h2 className="font-display text-[22px] tracking-tight text-primary">Required documents</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              These sections are previewed only. Validation and acceptance stay in the later planner flow.
            </p>
            <ul className="mt-4 space-y-3">
              <DocCheckRow
                title="Trip Memo"
                status="ok"
                summary="Preview overview, style, notes, assumptions"
                detail={s.memoText.overview}
              />
              <DocCheckRow
                title="Full Itinerary"
                status="ok"
                summary={`${s.itinerary.length} preview days - ${s.itinerary.length} stops mapped`}
                detail={`Day 1 - ${s.itinerary[0].name}, Day ${s.itinerary.length} - ${
                  s.itinerary[s.itinerary.length - 1].name
                }`}
              />
              <DocCheckRow
                title="Budget Plan"
                status="warn"
                summary={`Total ${s.budgetDoc.total} - Per person ${s.budgetDoc.perPerson}`}
                detail={s.budgetDoc.estimateNote}
              />
            </ul>

            <h2 className="mt-10 font-display text-[22px] tracking-tight text-primary">Selected destinations</h2>
            <ul className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3">
              {s.itinerary.map((d) => (
                <li key={d.day} className="overflow-hidden rounded-2xl bg-card ring-1 ring-border">
                  <div className="relative aspect-[5/4]">
                    <Image src={d.cover || "/placeholder.svg"} alt="" fill sizes="200px" className="object-cover" />
                  </div>
                  <div className="p-3">
                    <p className="text-[11.5px] uppercase tracking-wider text-muted-foreground">Day {d.day}</p>
                    <p className="mt-0.5 truncate font-display text-[15px] tracking-tight text-primary">{d.name}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl bg-card p-6 ring-1 ring-border shadow-[0_30px_80px_-30px_rgba(29,36,32,0.35)]">
              <h3 className="font-display text-[20px] tracking-tight text-primary">{s.title}</h3>
              <p className="mt-1 inline-flex items-center gap-1 text-[12.5px] text-muted-foreground">
                <Calendar className="size-3.5" aria-hidden />
                {s.range}
              </p>

              <div className="mt-5">
                <p className="text-[12.5px] font-medium text-foreground">Visibility</p>
                <div className="mt-2 space-y-2">
                  <VisibilityOption
                    icon={<Lock className="size-4" aria-hidden />}
                    label="Private"
                    description="Only you can see it."
                    checked
                  />
                  <VisibilityOption
                    icon={<Users className="size-4" aria-hidden />}
                    label="Invite only"
                    description="Available after real participant support."
                  />
                  <VisibilityOption
                    icon={<Globe2 className="size-4" aria-hidden />}
                    label="Public"
                    description="Available after accepted trips can publish."
                  />
                </div>
              </div>

              <div className="mt-5 flex items-start gap-2 rounded-xl bg-secondary p-3 text-[12.5px] text-foreground/80 ring-1 ring-border">
                <ShieldCheck className="mt-0.5 size-3.5 text-[color:var(--color-success)]" aria-hidden />
                <span>
                  Preview sections are available. No accepted Trip Plan, invite, or participant record is created.
                </span>
              </div>

              <div className="mt-5 flex items-center gap-2">
                <Link
                  href="/new/recommendations"
                  className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2.5 text-[13px] font-medium text-foreground ring-1 ring-border hover:bg-secondary"
                >
                  <ArrowLeft className="size-3.5" aria-hidden />
                  Back
                </Link>
                <button
                  type="button"
                  disabled
                  className="inline-flex flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-full bg-secondary px-4 py-2.5 text-[13.5px] font-medium text-muted-foreground ring-1 ring-border"
                >
                  <CheckCircle2 className="size-4" aria-hidden />
                  Accept deferred
                </button>
              </div>
              <p className="mt-3 text-[11.5px] text-muted-foreground">
                Acceptance, visibility changes, invites, and participants are implemented in the later planner flow.
              </p>
            </div>
          </aside>
        </div>
      </main>
      <AppFooter />
    </div>
  )
}

function DocCheckRow({
  title,
  status,
  summary,
  detail,
}: {
  title: string
  status: "ok" | "warn" | "missing"
  summary: string
  detail?: string
}) {
  const tone =
    status === "ok"
      ? "bg-[color:var(--color-success)]/15 text-[color:var(--color-success)]"
      : status === "warn"
        ? "bg-[color:var(--color-sunset-wash)]/40 text-[color:var(--color-warning)]"
        : "bg-[color:var(--color-error)]/15 text-[color:var(--color-error)]"
  const label = status === "ok" ? "Preview" : status === "warn" ? "Deferred" : "Missing"
  return (
    <li className="flex items-start gap-3 rounded-2xl bg-card p-4 ring-1 ring-border">
      <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${tone}`}>
        <CheckCircle2 className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="font-display text-[18px] tracking-tight text-primary">{title}</p>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${tone}`}>{label}</span>
        </div>
        <p className="mt-0.5 text-[13px] text-foreground/80">{summary}</p>
        {detail && <p className="mt-1 text-[12px] text-muted-foreground">{detail}</p>}
      </div>
    </li>
  )
}

function VisibilityOption({
  icon,
  label,
  description,
  checked,
}: {
  icon: React.ReactNode
  label: string
  description: string
  checked?: boolean
}) {
  return (
    <label
      className={
        checked
          ? "flex cursor-pointer items-start gap-3 rounded-xl bg-secondary p-3 ring-2 ring-primary"
          : "flex cursor-pointer items-start gap-3 rounded-xl bg-card p-3 ring-1 ring-border hover:ring-primary/40"
      }
    >
      <input type="radio" name="visibility" defaultChecked={checked} className="sr-only" disabled />
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-card text-primary ring-1 ring-border">
        {icon}
      </span>
      <span className="flex-1">
        <span className="block text-[13px] font-medium text-foreground">{label}</span>
        <span className="mt-0.5 block text-[12px] text-muted-foreground">{description}</span>
      </span>
    </label>
  )
}
