import Image from "next/image"
import {
  ArrowRight,
  ArrowUp,
  BookOpen,
  Bookmark,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ImageIcon,
  Lock,
  MoreHorizontal,
  RotateCcw,
  Share2,
  Sparkles,
  Star,
  X,
} from "lucide-react"
import { AppHeader } from "@/components/app-header"
import { AppFooter } from "@/components/app-footer"

const PREVIEW_DRAFT = {
  title: "Planner preview",
  memo: [
    "/landing/diamond-beach.png",
    "/landing/bali-coastal-pano.png",
    "/landing/bromo-tengger.png",
    "/landing/bali-woman-temple.png",
  ],
  itinerary: [
    { day: 1, name: "Selected stop", note: "Generated from saved recommendations" },
    { day: 2, name: "Route preview", note: "Draft itinerary only" },
    { day: 3, name: "Budget review", note: "Acceptance remains deferred" },
  ],
  budget: {
    total: "Preview only",
    perPerson: "Not accepted",
    accommodation: "Estimated",
    activities: "Estimated",
    meals: "Estimated",
  },
}

export default function PlanPage() {
  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[700px] opacity-40">
        <Image src="/landing/bali-coastal-pano.png" alt="" fill sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/85 to-background" />
      </div>

      <AppHeader active="plan" />

      <main className="mx-auto w-full max-w-[1480px] flex-1 px-6 pb-24 pt-4 md:px-10">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          {/* Left editorial */}
          <div className="lg:pt-10">
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">5 of 7</div>
            <h1 className="mt-6 font-display text-[clamp(2.2rem,4vw,3.6rem)] leading-[1.05] tracking-[-0.02em] text-primary text-balance">
              Build the trip
              <br />
              before you book
              <br /> anything.
            </h1>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-foreground/75">
              Open a planner preview after selecting recommendations. Acceptance and sharing stay deferred.
            </p>

            {/* Step rail */}
            <ol className="mt-12 flex items-center gap-2 text-[12px] text-muted-foreground">
              <RailStep icon={<ImageIcon className="size-4" aria-hidden />} label="Images" />
              <Dot />
              <RailStep icon={<Star className="size-4" aria-hidden />} label="Recommendations" />
              <Dot />
              <RailStep active icon={<BookOpen className="size-4" aria-hidden />} label="Plan" />
              <Dot />
              <RailStep icon={<CheckCircle2 className="size-4" aria-hidden />} label="Review" />
            </ol>

            <div className="mt-12 inline-flex items-center gap-3 rounded-2xl bg-card/85 px-4 py-3 ring-1 ring-border/70">
              <span className="grid size-8 place-items-center rounded-lg bg-secondary text-primary">
                <Lock className="size-4" aria-hidden />
              </span>
              <div>
                <p className="text-[13px] font-medium">Preview data is not persisted as an accepted trip.</p>
              </div>
            </div>
          </div>

          {/* Workspace card */}
          <div className="rounded-3xl bg-card p-5 ring-1 ring-border/70 shadow-[0_30px_80px_-30px_rgba(29,36,32,0.35)] md:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-display text-[22px] tracking-tight text-foreground">{PREVIEW_DRAFT.title}</span>
                <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
                <span className="ml-1 inline-flex items-center rounded-full bg-soft-accent/35 px-2.5 py-0.5 text-[11.5px] font-medium text-accent">
                  Draft
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden -space-x-2 md:flex">
                  <Avatar src="https://api.dicebear.com/7.x/notionists/svg?seed=A&backgroundColor=ece7dd" />
                  <Avatar src="https://api.dicebear.com/7.x/notionists/svg?seed=B&backgroundColor=ece7dd" />
                </div>
                <button
                  type="button"
                  disabled
                  className="grid size-7 cursor-not-allowed place-items-center rounded-full bg-secondary text-muted-foreground ring-1 ring-border"
                >
                  <span className="text-[14px] leading-none">+</span>
                </button>
                <button
                  type="button"
                  disabled
                  className="inline-flex cursor-not-allowed items-center gap-2 rounded-full bg-secondary px-3.5 py-1.5 text-[12.5px] font-medium text-muted-foreground ring-1 ring-border"
                >
                  <Share2 className="size-3.5" aria-hidden />
                  Share
                </button>
                <button className="grid size-8 place-items-center rounded-full bg-secondary ring-1 ring-border">
                  <MoreHorizontal className="size-4" aria-hidden />
                </button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
              {/* Left column */}
              <div className="space-y-4">
                <div className="rounded-2xl bg-secondary/70 p-4 ring-1 ring-border/70">
                  <div className="mb-3 inline-flex items-center gap-2 text-[13px] font-semibold">
                    <Bookmark className="size-4 text-primary" aria-hidden />
                    Trip Memo
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {PREVIEW_DRAFT.memo.map((src, i) => (
                      <div key={i} className="relative aspect-square overflow-hidden rounded-xl ring-1 ring-black/5">
                        <Image src={src || "/placeholder.svg"} alt="" fill sizes="80px" className="object-cover" />
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-[12px] text-muted-foreground">
                      Saved from Instagram, Pinterest, and camera roll · 23 items
                    </p>
                    <button
                      aria-label="Save"
                      className="grid size-7 place-items-center rounded-full bg-card text-foreground/70 ring-1 ring-border"
                    >
                      <Bookmark className="size-3.5" aria-hidden />
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl bg-secondary/70 p-4 ring-1 ring-border/70">
                  <div className="mb-3 inline-flex items-center gap-2 text-[13px] font-semibold">
                    <Calendar className="size-4 text-primary" aria-hidden />
                    Full Itinerary
                  </div>
                  <ul className="divide-y divide-border/70">
                    {PREVIEW_DRAFT.itinerary.map((d) => (
                      <li key={d.day} className="flex items-center gap-3 py-2.5">
                        <div className="grid w-10 text-center font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground">
                          <span>Day</span>
                          <span className="text-foreground">{d.day}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-medium">{d.name}</div>
                          <div className="truncate text-[11.5px] text-muted-foreground">{d.note}</div>
                        </div>
                        <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex items-center justify-between border-t border-border/70 pt-3">
                    <button className="text-[12.5px] text-muted-foreground" disabled>+ Add day</button>
                    <button className="inline-flex items-center gap-1 text-[12.5px] font-medium text-muted-foreground" disabled>
                      View full itinerary <ArrowRight className="size-3.5" aria-hidden />
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl bg-secondary/70 p-4 ring-1 ring-border/70">
                  <div className="mb-3 inline-flex items-center gap-2 text-[13px] font-semibold">
                    <Sparkles className="size-4 text-primary" aria-hidden />
                    Budget Plan
                  </div>
                  <div className="space-y-1.5 text-[13px]">
                    <Row label="Estimated total" value={PREVIEW_DRAFT.budget.total} bold />
                    <Row label="Per person" value={PREVIEW_DRAFT.budget.perPerson} bold />
                    <div className="my-2 border-t border-border/70" />
                    <Row label="Accommodation" value={PREVIEW_DRAFT.budget.accommodation} muted />
                    <Row label="Activities & Transport" value={PREVIEW_DRAFT.budget.activities} muted />
                    <Row label="Meals & Other" value={PREVIEW_DRAFT.budget.meals} muted />
                  </div>
                  <button className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-muted-foreground" disabled>
                    View full budget <ArrowRight className="size-3.5" aria-hidden />
                  </button>
                </div>
              </div>

              {/* Right column: assistant */}
              <div className="flex h-full flex-col rounded-2xl bg-secondary/40 p-4 ring-1 ring-border/70">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="grid size-7 place-items-center rounded-full bg-primary text-primary-foreground">
                      <Sparkles className="size-3.5" aria-hidden />
                    </span>
                    <div>
                      <div className="inline-flex items-center gap-1 text-[13.5px] font-semibold">
                        Plan Assistant <Sparkles className="size-3 text-accent" aria-hidden />
                      </div>
                      <div className="text-[11.5px] text-muted-foreground">Here to help you refine every detail.</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-card">
                      <RotateCcw className="size-3.5" aria-hidden />
                    </button>
                    <button className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-card">
                      <X className="size-3.5" aria-hidden />
                    </button>
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
                  <Bubble side="user">Can we add a sunrise hike on Day 2 and make Day 3 a bit more relaxed?</Bubble>
                  <Bubble side="assistant">
                    Sure. I&apos;ve added a sunrise hike on Day 2 and adjusted Day 3 to a slower pace.
                  </Bubble>

                  <div className="rounded-xl bg-card p-3 ring-1 ring-border/70">
                    <div className="text-[12.5px] font-semibold">Updates made</div>
                    <ul className="mt-2 space-y-1.5 text-[12.5px] text-foreground/80">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 size-3.5 text-success" aria-hidden />
                        Added Mount Batur sunrise hike (Day 2) before breakfast
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 size-3.5 text-success" aria-hidden />
                        Moved Waterfalls to Day 3 morning
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 size-3.5 text-success" aria-hidden />
                        Added afternoon beach time in Nusa Penida
                      </li>
                    </ul>
                    <button className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-primary">
                      View changes <ArrowRight className="size-3" aria-hidden />
                    </button>
                  </div>

                  <Bubble side="user">Looks great! Also, can you keep the budget under IDR 10,000,000?</Bubble>
                  <Bubble side="assistant">Done. I&apos;ve adjusted the plan and budget to stay under IDR 10,000,000.</Bubble>

                  <div className="flex items-center gap-2 rounded-xl bg-card p-3 ring-1 ring-border/70">
                    <span className="grid size-7 place-items-center rounded-full bg-success/15 text-success">
                      <CheckCircle2 className="size-3.5" aria-hidden />
                    </span>
                    <div>
                      <div className="text-[12.5px] font-semibold">Budget updated</div>
                      <div className="text-[11.5px] text-muted-foreground">New total: IDR 9,850,000</div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2 rounded-2xl bg-card p-2 ring-1 ring-border/70">
                  <input
                    placeholder="Ask anything about your trip…"
                    className="min-w-0 flex-1 bg-transparent px-2 text-[13px] outline-none placeholder:text-muted-foreground"
                  />
                  <button
                    aria-label="Send"
                    className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground hover:bg-[#0b2a25]"
                  >
                    <ArrowUp className="size-4" aria-hidden />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  )
}

function Row({
  label,
  value,
  muted,
  bold,
}: {
  label: string
  value: string
  muted?: boolean
  bold?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-muted-foreground" : "text-foreground"}>{label}</span>
      <span className={bold ? "font-semibold text-foreground" : "text-foreground/80"}>{value}</span>
    </div>
  )
}

function Avatar({ src }: { src: string }) {
  return (
    <span className="grid size-7 place-items-center overflow-hidden rounded-full ring-2 ring-card">
      <Image src={src || "/placeholder.svg"} alt="" width={28} height={28} className="size-7 object-cover" unoptimized />
    </span>
  )
}

function Bubble({ side, children }: { side: "user" | "assistant"; children: React.ReactNode }) {
  if (side === "user") {
    return (
      <div className="ml-auto max-w-[86%] rounded-2xl rounded-br-sm bg-card px-3.5 py-2.5 text-[13px] text-foreground ring-1 ring-border/70">
        {children}
      </div>
    )
  }
  return (
    <div className="flex max-w-[92%] gap-2">
      <span className="grid size-6 place-items-center rounded-full bg-primary text-primary-foreground">
        <Sparkles className="size-3" aria-hidden />
      </span>
      <div className="rounded-2xl rounded-tl-sm bg-card px-3.5 py-2.5 text-[13px] text-foreground/85 ring-1 ring-border/70">
        {children}
      </div>
    </div>
  )
}

function RailStep({
  icon,
  label,
  active,
}: {
  icon: React.ReactNode
  label: string
  active?: boolean
}) {
  return (
    <li className="flex items-center gap-2">
      <span
        className={
          active
            ? "grid size-9 place-items-center rounded-full bg-primary text-primary-foreground"
            : "grid size-9 place-items-center rounded-full bg-secondary text-foreground/70 ring-1 ring-border"
        }
      >
        {icon}
      </span>
      <span className={active ? "text-[12px] font-semibold text-primary" : "text-[12px]"}>{label}</span>
    </li>
  )
}

function Dot() {
  return <span className="text-muted-foreground/60">·····</span>
}
