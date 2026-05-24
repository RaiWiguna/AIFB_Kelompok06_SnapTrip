"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AnimatePresence, LayoutGroup, motion } from "framer-motion"
import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ImageIcon,
  MoreHorizontal,
  RotateCcw,
  Share2,
  Sparkles,
  Star,
  Wallet,
  X,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AgentTimeline } from "@/components/planner/agent-timeline"
import { ChatComposer } from "@/components/planner/chat-composer"
import { ReviewPanel } from "@/components/planner/review-panel"
import { acceptPlannerSession, getPlannerSession, sendPlannerMessage } from "@/lib/api/planner-sessions"
import type { PlannerSessionDisplay, PlannerWorkspaceInitialState } from "@/lib/api/types"
import { plannerTimeline } from "@/lib/planner-events"

type PlannerWorkspaceProps = {
  initialPlanner?: PlannerSessionDisplay
  tripId?: string
  title?: string
  initialState?: PlannerWorkspaceInitialState
  acceptanceReason?: string
}

type DayDraft = { day: number; name: string; note: string }

type WorkspaceState = PlannerWorkspaceInitialState

const EMPTY_STATE: WorkspaceState = {
  memoCaption: null,
  memoItemCount: 0,
  memoTiles: [],
  itineraryDays: [],
  budget: null,
}

type Phase = "plan" | "review"

export function PlannerWorkspace(props: PlannerWorkspaceProps) {
  const initialPlanner = props.initialPlanner ?? legacyPlannerFromProps(props)
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>("plan")
  const [planner, setPlanner] = useState(initialPlanner)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const state: WorkspaceState = planner.workspace ?? EMPTY_STATE
  const runs = useMemo(() => plannerTimeline(planner.messages, planner.events), [planner.events, planner.messages])
  const isRunning = planner.status === "working" || isSubmitting
  const title = planner.title
  const tripId = planner.sessionId
  const acceptanceReason = planner.acceptance.reason

  // Auto-scroll the chat as runs progress.
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }, [runs])

  const sendMessage = useCallback(
    async (text: string) => {
      if (isRunning) return
      setError("")
      setIsSubmitting(true)
      try {
        setPlanner(await sendPlannerMessage(planner.sessionId, text))
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not send planner message")
      } finally {
        setIsSubmitting(false)
      }
    },
    [isRunning, planner.sessionId],
  )

  const refreshSession = useCallback(async () => {
    setError("")
    try {
      setPlanner(await getPlannerSession(planner.sessionId))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not refresh planner session")
    }
  }, [planner.sessionId])

  useEffect(() => {
    if (planner.status !== "working") return
    const timer = window.setInterval(() => {
      void refreshSession()
    }, 1600)
    return () => window.clearInterval(timer)
  }, [planner.status, refreshSession])

  const isEmpty = runs.length === 0
  const canReview = planner.acceptance.enabled

  return (
    <LayoutGroup>
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        {/* Left editorial */}
        <div className="lg:pt-2">
          <motion.div
            key={phase + "-eyebrow"}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent"
          >
            {phase === "plan" ? "Step 4 · Plan" : "Step 5 · Review"}
          </motion.div>
          <motion.h1
            key={phase + "-title"}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 font-display text-[clamp(2.2rem,4vw,3.6rem)] leading-[1.05] tracking-[-0.02em] text-primary text-balance"
          >
            {phase === "plan" ? (
              <>
                Build the trip
                <br /> before you book
                <br /> anything.
              </>
            ) : (
              <>
                Review and accept
                <br /> the plan you
                <br /> built together.
              </>
            )}
          </motion.h1>
          <motion.p
            key={phase + "-blurb"}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 max-w-md text-[15px] leading-relaxed text-foreground/75"
          >
            {phase === "plan"
              ? "Revise the plan through conversation while the memo, itinerary, and budget stay organized."
              : "When everything checks out, accept the plan to lock it as your trip. You can adjust visibility and invite people any time afterward."}
          </motion.p>

          <ol className="mt-12 flex items-center gap-2 text-[12px] text-muted-foreground">
            <RailStep icon={<ImageIcon className="size-4" aria-hidden />} label="Images" />
            <Dot />
            <RailStep icon={<Star className="size-4" aria-hidden />} label="Recs" />
            <Dot />
            <RailStep
              active={phase === "plan"}
              icon={<BookOpen className="size-4" aria-hidden />}
              label="Plan"
            />
            <Dot />
            <RailStep
              active={phase === "review"}
              icon={<CheckCircle2 className="size-4" aria-hidden />}
              label="Review"
            />
          </ol>

          <div className="mt-10 inline-flex items-center gap-3 rounded-2xl bg-card/85 px-4 py-3 ring-1 ring-border/70">
            <span className="grid size-8 place-items-center rounded-lg bg-secondary text-primary">
              <Sparkles className="size-4" aria-hidden />
            </span>
            <p className="text-[13px] font-medium">
              {phase === "plan"
                ? "Your plan is private until you share."
                : "Acceptance promotes this draft to a saved trip."}
            </p>
          </div>

          <div className="mt-8 flex items-center justify-between">
            <Link
              href="/new/recommendations"
              className="text-[12.5px] font-medium text-muted-foreground hover:text-primary"
            >
              ← Back to recommendations
            </Link>
            {phase === "plan" ? (
              <button
                type="button"
                onClick={() => canReview && setPhase("review")}
                disabled={!canReview}
                className={
                  canReview
                    ? "inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[12.5px] font-medium text-primary-foreground hover:bg-[#0b2a25]"
                    : "inline-flex items-center gap-1.5 rounded-full bg-secondary px-4 py-2 text-[12.5px] font-medium text-muted-foreground ring-1 ring-border"
                }
                title={canReview ? "" : acceptanceReason}
              >
                Continue to review <ArrowRight className="size-3.5" aria-hidden />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setPhase("plan")}
                className="inline-flex items-center gap-1.5 rounded-full bg-card px-4 py-2 text-[12.5px] font-medium text-foreground ring-1 ring-border hover:bg-secondary"
              >
                ← Back to assistant
              </button>
            )}
          </div>
        </div>

        {/* Workspace card */}
        <motion.div
          layout
          className="rounded-3xl bg-card p-5 ring-1 ring-border/70 shadow-[0_30px_80px_-30px_rgba(29,36,32,0.35)] md:p-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-display text-[22px] tracking-tight text-foreground">{title}</span>
              <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
              <motion.span
                key={phase + "-pill"}
                initial={{ opacity: 0, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                className="ml-1 inline-flex items-center rounded-full bg-soft-accent/35 px-2.5 py-0.5 text-[11.5px] font-medium text-accent"
              >
                {phase === "plan" ? "Draft" : "Review"}
              </motion.span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-disabled="true"
                title="Sharing is implemented in the later planner flow."
                className="inline-flex cursor-not-allowed items-center gap-2 rounded-full bg-secondary px-3.5 py-1.5 text-[12.5px] font-medium text-foreground ring-1 ring-border"
              >
                <Share2 className="size-3.5" aria-hidden />
                Share
              </button>
              <button
                aria-label="More"
                className="grid size-8 place-items-center rounded-full bg-secondary ring-1 ring-border"
              >
                <MoreHorizontal className="size-4" aria-hidden />
              </button>
            </div>
          </div>

          <motion.div
            layout
            className={
              phase === "plan"
                ? "mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2"
                : "mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]"
            }
          >
            {/* Left column — always: memo / itinerary / budget */}
            <motion.div layout className="space-y-4">
              <MemoCard
                tripId={tripId}
                tiles={state.memoTiles}
                caption={state.memoCaption}
                itemCount={state.memoItemCount}
              />
              <ItineraryCard tripId={tripId} days={state.itineraryDays} />
              <BudgetCard tripId={tripId} budget={state.budget} />
            </motion.div>

            {/* Right column — chat (plan) or review (review), animated.
                The cell is positioned `relative` so its absolutely-positioned content
                fills the row height (matching the left column) without contributing
                its own intrinsic height — long chats scroll inside instead of
                stretching the row. */}
            <div className="relative min-h-[520px]">
              <AnimatePresence mode="wait" initial={false}>
                {phase === "plan" ? (
                  <motion.div
                    key="chat"
                    layout
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 24 }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-0 flex flex-col overflow-hidden rounded-2xl bg-secondary/40 p-4 ring-1 ring-border/70"
                  >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="grid size-7 place-items-center rounded-full bg-primary text-primary-foreground">
                        <Sparkles className="size-3.5" aria-hidden />
                      </span>
                      <div>
                        <div className="inline-flex items-center gap-1 text-[13.5px] font-semibold">
                          Plan Assistant <Sparkles className="size-3 text-accent" aria-hidden />
                        </div>
                        <div className="text-[11.5px] text-muted-foreground">
                          {isRunning ? "Working on your plan..." : statusLabel(planner.status)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        aria-label="Refresh planner session"
                        onClick={refreshSession}
                        disabled={isRunning}
                        className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-card disabled:opacity-40"
                      >
                        <RotateCcw className="size-3.5" aria-hidden />
                      </button>
                      <button
                        aria-label="Close"
                        className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-card"
                      >
                        <X className="size-3.5" aria-hidden />
                      </button>
                    </div>
                  </div>

                  <div ref={scrollerRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
                    {error ? (
                      <div className="rounded-2xl bg-[color:var(--color-sunset-wash)]/35 px-3 py-2 text-[12.5px] text-[color:var(--color-warning)] ring-1 ring-border">
                        {error}
                      </div>
                    ) : null}
                    {isEmpty ? (
                      <EmptyChatState />
                    ) : (
                      <AgentTimeline runs={runs} />
                    )}
                  </div>

                  <div className="mt-3">
                    <ChatComposer
                      onSubmit={sendMessage}
                      disabled={isRunning}
                      placeholder={isRunning ? "Working…" : "Ask anything about your trip…"}
                    />
                  </div>
                </motion.div>
                ) : (
                  <motion.div
                    key="review"
                    layout
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-0 flex flex-col overflow-hidden rounded-2xl bg-secondary/40 p-4 ring-1 ring-border/70"
                  >
                    <ReviewPanel
                      acceptanceReason={acceptanceReason}
                      acceptanceEnabled={planner.acceptance.enabled}
                      state={{
                        memoCaption: state.memoCaption,
                        memoItemCount: state.memoItemCount,
                        memoTilesCount: state.memoTiles.length,
                        itineraryDays: state.itineraryDays,
                        budget: state.budget,
                      }}
                      onBack={() => setPhase("plan")}
                      onAccept={async (visibility) => {
                        setError("")
                        try {
                          const accepted = await acceptPlannerSession(planner.sessionId, visibility)
                          router.push(`/trips/${accepted.trip_plan.id}`)
                        } catch (err) {
                          setError(err instanceof Error ? err.message : "Could not accept planner session")
                          setPhase("plan")
                        }
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </LayoutGroup>
  )
}

/* ---------------------------- Cards ---------------------------- */

function MemoCard({
  tripId,
  tiles,
  caption,
  itemCount,
}: {
  tripId: string
  tiles: { src: string; alt: string }[]
  caption: string | null
  itemCount: number
}) {
  const empty = tiles.length === 0
  return (
    <motion.div layout className="rounded-2xl bg-secondary/70 p-4 ring-1 ring-border/70">
      <div className="mb-3 flex items-center justify-between">
        <div className="inline-flex items-center gap-2 text-[13px] font-semibold">
          <Bookmark className="size-4 text-primary" aria-hidden />
          Trip Memo
        </div>
        <ExpandLink href={`/plan/${tripId}/memo`} disabled={empty} label="Open full memo" />
      </div>
      {empty ? (
        <div className="grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="aspect-square rounded-xl bg-card/70 ring-1 ring-dashed ring-border/70"
            />
          ))}
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-4 gap-2">
          {tiles.map((t, i) => (
            <motion.div
              key={`${t.src}-${i}`}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="relative aspect-square overflow-hidden rounded-xl ring-1 ring-black/5"
            >
              <Image src={t.src || "/placeholder.svg"} alt={t.alt} fill sizes="80px" className="object-cover" unoptimized />
            </motion.div>
          ))}
        </motion.div>
      )}
      <p className="mt-3 text-[12px] text-muted-foreground">
        {empty
          ? "The memo is empty. Ask the assistant to draft one from your saved images."
          : caption ?? `${itemCount} items saved from Instagram, Pinterest, and camera roll.`}
      </p>
    </motion.div>
  )
}

function ItineraryCard({ tripId, days }: { tripId: string; days: DayDraft[] }) {
  const empty = days.length === 0
  return (
    <motion.div layout className="rounded-2xl bg-secondary/70 p-4 ring-1 ring-border/70">
      <div className="mb-3 flex items-center justify-between">
        <div className="inline-flex items-center gap-2 text-[13px] font-semibold">
          <Calendar className="size-4 text-primary" aria-hidden />
          Full Itinerary
        </div>
        <ExpandLink href={`/plan/${tripId}/itinerary`} disabled={empty} label="Open full itinerary" />
      </div>
      {empty ? (
        <div className="rounded-xl border border-dashed border-border/70 p-4 text-center text-[12.5px] text-muted-foreground">
          No days yet. The assistant will draft a day-by-day plan when you ask.
        </div>
      ) : (
        <ul className="divide-y divide-border/70">
          <AnimatePresence initial={false}>
            {days.map((d) => (
              <motion.li
                layout
                key={d.day}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 py-2.5"
              >
                <div className="grid w-10 text-center font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground">
                  <span>Day</span>
                  <span className="text-foreground">{d.day}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium">{d.name}</div>
                  <div className="truncate text-[11.5px] text-muted-foreground">{d.note}</div>
                </div>
                <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </motion.div>
  )
}

function BudgetCard({ tripId, budget }: { tripId: string; budget: WorkspaceState["budget"] }) {
  return (
    <motion.div layout className="rounded-2xl bg-secondary/70 p-4 ring-1 ring-border/70">
      <div className="mb-3 flex items-center justify-between">
        <div className="inline-flex items-center gap-2 text-[13px] font-semibold">
          <Wallet className="size-4 text-primary" aria-hidden />
          Budget Plan
        </div>
        <ExpandLink href={`/plan/${tripId}/budget`} disabled={!budget} label="Open full budget" />
      </div>
      {!budget ? (
        <div className="rounded-xl border border-dashed border-border/70 p-4 text-center text-[12.5px] text-muted-foreground">
          No estimate yet. Ask the assistant for a budget once the itinerary is drafted.
        </div>
      ) : (
        <motion.div
          layout
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-1.5 text-[13px]"
        >
          <Row label="Estimated total" value={budget.total} bold />
          <Row label="Per person" value={budget.perPerson} bold />
          <div className="my-2 border-t border-border/70" />
          <Row label="Accommodation" value={budget.accommodation} muted />
          <Row label="Activities & Transport" value={budget.activities} muted />
          <Row label="Meals & Other" value={budget.meals} muted />
        </motion.div>
      )}
    </motion.div>
  )
}

function Row({ label, value, muted, bold }: { label: string; value: string; muted?: boolean; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-muted-foreground" : "text-foreground"}>{label}</span>
      <span className={bold ? "font-semibold text-foreground" : "text-foreground/80"}>{value}</span>
    </div>
  )
}

function EmptyChatState() {
  return (
    <div className="flex flex-1 flex-col items-start justify-center gap-3 py-6">
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground">
          <Sparkles className="size-4" aria-hidden />
        </span>
        <div>
          <div className="text-[14px] font-semibold">Planner run is being prepared.</div>
          <div className="text-[12.5px] text-muted-foreground">The initial trip request is sent automatically.</div>
        </div>
      </div>
    </div>
  )
}

function statusLabel(status: string) {
  return {
    idle: "Idle",
    working: "Working",
    needs_input: "Needs your input",
    ready_to_review: "Ready to review",
    interrupted: "Interrupted",
    accepted: "Accepted",
  }[status] ?? "Idle"
}

function legacyPlannerFromProps(props: PlannerWorkspaceProps): PlannerSessionDisplay {
  const workspace = props.initialState ?? EMPTY_STATE
  return {
    sessionId: props.tripId ?? "planner",
    title: props.title ?? "Trip planner",
    status: "needs_input",
    categories: [],
    documentsPersisted: false,
    documentNote: props.acceptanceReason ?? "Planner documents are incomplete.",
    acceptance: {
      enabled: false,
      reason: props.acceptanceReason ?? "Planner documents are incomplete.",
    },
    detail: {
      id: props.tripId ?? "planner",
      itinerary: [],
      destinations: [],
      budgetCategories: [],
      budgetDaily: [],
      memoMarkdown: "",
      memoCaption: workspace.memoCaption ?? "",
      memoSource: "Planner",
      memoItems: workspace.memoItemCount,
      memoTiles: workspace.memoTiles,
      galleryThumbs: [],
      galleryMore: 0,
      participants: [],
    },
    budgetTotalAmount: workspace.budget?.total ?? "Budget TBD",
    budgetTotalLabel: "",
    workspace,
    messages: [],
    events: [],
    ready: false,
    acceptedTripPlanId: null,
    travelStartDate: "",
    travelEndDate: "",
    travelerCount: 0,
  }
}

function RailStep({ icon, label, active }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <li className="flex items-center gap-2">
      <motion.span
        layout
        animate={{
          backgroundColor: active ? "rgb(13, 41, 33)" : "rgb(236, 231, 221)",
          color: active ? "rgb(245, 240, 232)" : "rgba(31, 39, 35, 0.7)",
        }}
        transition={{ duration: 0.25 }}
        className="grid size-9 place-items-center rounded-full ring-1 ring-border"
      >
        {icon}
      </motion.span>
      <span className={active ? "text-[12px] font-semibold text-primary" : "text-[12px]"}>{label}</span>
    </li>
  )
}

function Dot() {
  return <span className="text-muted-foreground/60">·····</span>
}

function ExpandLink({ href, disabled, label }: { href: string; disabled?: boolean; label: string }) {
  if (disabled) {
    return (
      <span
        aria-disabled
        title="Add content with the assistant first"
        className="inline-flex items-center gap-1 rounded-full bg-card/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground/70 ring-1 ring-border/60"
      >
        Expand
        <ArrowUpRight className="size-3" aria-hidden />
      </span>
    )
  }
  return (
    <Link
      href={href}
      aria-label={label}
      className="group inline-flex items-center gap-1 rounded-full bg-card px-2.5 py-1 text-[11px] font-medium text-foreground/85 ring-1 ring-border/70 transition-colors hover:bg-primary hover:text-primary-foreground"
    >
      Expand
      <ArrowUpRight className="size-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
    </Link>
  )
}
