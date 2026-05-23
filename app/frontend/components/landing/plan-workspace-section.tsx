import Image from "next/image"
import section5Bg from "@/public/landing/section-5.png"
import {
  ArrowRight,
  ArrowUp,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock,
  History,
  Image as ImageIcon,
  MessageSquare,
  PiggyBank,
  Plus,
  Sparkles,
  Star,
  X,
} from "lucide-react"
import { PLAN_DRAFT } from "@/lib/data"
import { Float, LandingSection, Reveal, Stagger, StaggerItem } from "@/components/landing/landing-motion"

export function PlanWorkspaceSection() {
  return (
    <LandingSection className="relative overflow-hidden bg-background py-16 md:flex md:min-h-[125svh] md:items-center md:py-8">
      <div aria-hidden className="absolute inset-0 h-full w-full">
        <Image
          src={section5Bg}
          alt=""
          fill
          sizes="100vw"
          className="h-full w-full object-cover"
          priority={false}
        />
      </div>

      <div className="relative mx-auto grid w-full max-w-[1480px] grid-cols-1 gap-8 px-6 md:grid-cols-12 md:items-center md:px-10">
        {/* Left copy */}
        <Reveal className="md:col-span-4 md:pt-6" direction="right">
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">
            5 of 7
          </div>
          <h2 className="mt-5 font-display text-[clamp(2.2rem,4vw,3.6rem)] leading-[1.02] tracking-[-0.01em] text-primary">
            Build the trip
            <br />
            before you book
            <br />
            anything.
          </h2>
          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            Revise the plan through conversation while the memo, itinerary,
            and budget stay organized.
          </p>

          {/* Step indicator */}
          <Stagger className="mt-8 flex items-center gap-3">
            {[
              { icon: ImageIcon, label: "Images", active: false },
              { icon: Star, label: "Recommendations", active: false },
              { icon: BookOpen, label: "Plan", active: true },
              { icon: CheckCircle2, label: "Review", active: false },
            ].map((s, i, arr) => (
              <StaggerItem key={s.label} className="flex items-center gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={`grid size-12 place-items-center rounded-full transition ${
                      s.active
                        ? "bg-card text-primary ring-1 ring-primary"
                        : "bg-card text-muted-foreground ring-1 ring-border"
                    }`}
                  >
                    <s.icon className="size-5" aria-hidden />
                  </span>
                  <span
                    className={`mt-2 text-[11.5px] font-medium ${
                      s.active ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < arr.length - 1 ? (
                  <span
                    aria-hidden
                    className="mb-5 hidden h-px w-8 border-t border-dashed border-border/80 sm:block"
                  />
                ) : null}
              </StaggerItem>
            ))}
          </Stagger>

          <div className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-card/85 px-4 py-3 ring-1 ring-border/70 backdrop-blur-sm">
            <span className="grid size-6 place-items-center rounded-md bg-secondary text-primary">
              <CheckCircle2 className="size-3.5" aria-hidden />
            </span>
            <span className="text-[13px] text-foreground">
              Your plan is private until you share.
            </span>
          </div>
        </Reveal>

        {/* Right: planner mock */}
        <Reveal className="md:col-span-8" direction="left" delay={0.08}>
          <Float className="rounded-[24px] bg-card/95 p-4 shadow-[0_40px_100px_-40px_rgba(29,36,32,0.45)] ring-1 ring-border/70 backdrop-blur md:p-5" amplitude={5} duration={9}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
              {/* Center docs */}
              <div className="md:col-span-7">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[16px] font-medium text-foreground">
                      Bali & Nusa Penida
                    </span>
                    <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
                    <span className="ml-1 inline-flex items-center rounded-full bg-soft-accent/40 px-2 py-0.5 text-[11.5px] font-medium text-accent">
                      Draft
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-1.5">
                      <span className="size-7 rounded-full bg-secondary ring-2 ring-card" />
                      <span className="size-7 rounded-full bg-soft-accent/60 ring-2 ring-card" />
                      <span className="grid size-7 place-items-center rounded-full bg-card text-foreground/70 ring-1 ring-border">
                        <Plus className="size-3" aria-hidden />
                      </span>
                    </div>
                    <button disabled className="cursor-not-allowed rounded-full bg-card px-3 py-1.5 text-[12.5px] font-medium text-foreground opacity-60 ring-1 ring-border">
                      Share
                    </button>
                  </div>
                </div>

                {/* Trip Memo */}
                <div className="mt-3 rounded-2xl bg-secondary/50 p-3.5 ring-1 ring-border/60">
                  <div className="flex items-center gap-2 text-[13.5px] font-medium text-foreground">
                    <ImageIcon className="size-4 text-primary" aria-hidden />
                    Trip Memo
                  </div>
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {PLAN_DRAFT.memo.map((src, i) => (
                      <div
                        key={i}
                        className="relative aspect-square overflow-hidden rounded-xl ring-1 ring-black/5"
                      >
                        <Image
                          src={src || "/placeholder.svg"}
                          alt=""
                          fill
                          sizes="100px"
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-[12px] text-muted-foreground">
                    Saved from Instagram, Pinterest, and camera roll · 23 items
                  </p>
                </div>

                {/* Full Itinerary */}
                <div className="mt-3 rounded-2xl bg-secondary/50 p-3.5 ring-1 ring-border/60">
                  <div className="flex items-center gap-2 text-[13.5px] font-medium text-foreground">
                    <BookOpen className="size-4 text-primary" aria-hidden />
                    Full Itinerary
                  </div>
                  <ul className="mt-3 divide-y divide-border/60">
                    {PLAN_DRAFT.itinerary.map((d) => (
                      <li key={d.day} className="flex items-center gap-3 py-2.5">
                        <div className="grid w-9 shrink-0 text-[10.5px] font-mono uppercase tracking-wider text-muted-foreground">
                          <span>Day</span>
                          <span className="text-foreground">{d.day}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-medium text-foreground">
                            {d.name}
                          </div>
                          <div className="truncate text-[11.5px] text-muted-foreground">
                            {d.note}
                          </div>
                        </div>
                        <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-2.5">
                    <button disabled className="cursor-not-allowed text-[12.5px] text-muted-foreground opacity-60">
                      + Add day
                    </button>
                    <button disabled className="inline-flex cursor-not-allowed items-center gap-1.5 text-[12.5px] font-medium text-primary opacity-60">
                      View full itinerary
                      <ArrowRight className="size-3" aria-hidden />
                    </button>
                  </div>
                </div>

                {/* Budget */}
                <div className="mt-3 rounded-2xl bg-secondary/50 p-3.5 ring-1 ring-border/60">
                  <div className="flex items-center gap-2 text-[13.5px] font-medium text-foreground">
                    <PiggyBank className="size-4 text-primary" aria-hidden />
                    Budget Plan
                  </div>
                  <ul className="mt-3 divide-y divide-border/60 text-[13px]">
                    <BudgetRow label="Estimated total" value={PLAN_DRAFT.budget.total} bold />
                    <BudgetRow label="Per person" value={PLAN_DRAFT.budget.perPerson} bold />
                    <BudgetRow label="Accommodation" value={PLAN_DRAFT.budget.accommodation} muted />
                    <BudgetRow label="Activities & Transport" value={PLAN_DRAFT.budget.activities} muted />
                    <BudgetRow label="Meals & Other" value={PLAN_DRAFT.budget.meals} muted />
                  </ul>
                  <div className="mt-2 flex items-center justify-end border-t border-border/60 pt-2">
                    <button disabled className="inline-flex cursor-not-allowed items-center gap-1.5 text-[12.5px] font-medium text-primary opacity-60">
                      View full budget
                      <ArrowRight className="size-3" aria-hidden />
                    </button>
                  </div>
                </div>
              </div>

              {/* Right: Plan Assistant */}
              <div className="md:col-span-5">
                <div className="rounded-2xl bg-card p-3.5 ring-1 ring-border/70">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="grid size-8 place-items-center rounded-full bg-secondary text-primary">
                        <Sparkles className="size-4" aria-hidden />
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5 text-[13.5px] font-medium text-foreground">
                          Plan Assistant
                          <Sparkles className="size-3 text-accent" aria-hidden />
                        </div>
                        <div className="text-[11.5px] text-muted-foreground">
                          Here to help you refine every detail.
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <button disabled className="grid size-7 cursor-not-allowed place-items-center rounded-full opacity-60" aria-label="History">
                        <History className="size-3.5" aria-hidden />
                      </button>
                      <button disabled className="grid size-7 cursor-not-allowed place-items-center rounded-full opacity-60" aria-label="Close">
                        <X className="size-3.5" aria-hidden />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2.5">
                    <UserBubble>
                      Can we add a sunrise hike on Day 2 and make Day 3 a bit more relaxed?
                    </UserBubble>
                    <AiBubble>
                      Sure. I’ve added a sunrise hike on Day 2 and adjusted Day 3 to a slower pace.
                    </AiBubble>
                    <div className="rounded-xl bg-secondary/60 p-3 ring-1 ring-border/60">
                      <div className="text-[12.5px] font-medium text-foreground">
                        Updates made
                      </div>
                      <ul className="mt-1.5 space-y-1 text-[12px] text-foreground/80">
                        <li className="flex items-start gap-1.5">
                          <CheckCircle2 className="mt-0.5 size-3 text-success" aria-hidden />
                          Added Mount Batur sunrise hike (Day 2) before breakfast
                        </li>
                        <li className="flex items-start gap-1.5">
                          <CheckCircle2 className="mt-0.5 size-3 text-success" aria-hidden />
                          Moved Waterfalls to Day 3 morning
                        </li>
                        <li className="flex items-start gap-1.5">
                          <CheckCircle2 className="mt-0.5 size-3 text-success" aria-hidden />
                          Added afternoon beach time in Nusa Penida
                        </li>
                      </ul>
                      <button disabled className="mt-2 inline-flex cursor-not-allowed items-center gap-1 text-[12px] font-medium text-primary opacity-60">
                        View changes
                        <ArrowRight className="size-3" aria-hidden />
                      </button>
                    </div>
                    <UserBubble>
                      Looks great! Also, can you keep the budget under IDR 10,000,000?
                    </UserBubble>
                    <AiBubble>
                      Done. I’ve adjusted the plan and budget to stay under IDR 10,000,000.
                    </AiBubble>
                    <div className="flex items-center gap-2 rounded-xl bg-success/10 px-3 py-2 ring-1 ring-success/30">
                      <CheckCircle2 className="size-4 text-success" aria-hidden />
                      <div>
                        <div className="text-[12.5px] font-medium text-foreground">
                          Budget updated
                        </div>
                        <div className="text-[11.5px] text-muted-foreground">
                          New total: IDR 9,850,000
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2 rounded-2xl bg-secondary/60 px-3 py-2 ring-1 ring-border/60">
                    <MessageSquare className="size-4 text-muted-foreground" aria-hidden />
                    <input
                      placeholder="Ask anything about your trip…"
                      className="flex-1 cursor-not-allowed bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
                    />
                    <button
                      type="button"
                      aria-label="Send"
                      className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground"
                    >
                      <ArrowUp className="size-4" aria-hidden />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Float>
        </Reveal>
      </div>
    </LandingSection>
  )
}

function BudgetRow({
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
    <li className="flex items-center justify-between py-2">
      <span className={muted ? "text-muted-foreground" : "text-foreground"}>
        {label}
      </span>
      <span
        className={`font-mono ${bold ? "font-semibold text-foreground" : "text-foreground/85"}`}
      >
        {value}
      </span>
    </li>
  )
}

function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="ml-6 rounded-2xl rounded-tr-md bg-secondary px-3.5 py-2.5 text-[12.5px] leading-relaxed text-foreground">
      {children}
    </div>
  )
}

function AiBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-secondary text-primary">
        <Sparkles className="size-3" aria-hidden />
      </span>
      <div className="rounded-2xl rounded-tl-md bg-card px-3.5 py-2.5 text-[12.5px] leading-relaxed text-foreground ring-1 ring-border/60">
        {children}
      </div>
    </div>
  )
}

