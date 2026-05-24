"use client"

import { ArrowLeft, ArrowRight, CheckCircle2, Globe2, Lock, Users } from "lucide-react"
import { useState } from "react"

type Visibility = "private" | "invite_only" | "public"

type WorkspaceState = {
  memoCaption: string | null
  memoItemCount: number
  memoTilesCount: number
  itineraryDays: { day: number; name: string; note: string }[]
  budget: {
    total: string
    perPerson: string
    accommodation: string
    activities: string
    meals: string
  } | null
}

export function ReviewPanel({
  state,
  acceptanceReason,
  acceptanceEnabled,
  onBack,
  onAccept,
}: {
  state: WorkspaceState
  acceptanceReason?: string
  acceptanceEnabled?: boolean
  onBack: () => void
  onAccept?: (visibility: Visibility) => Promise<void> | void
}) {
  const [visibility, setVisibility] = useState<Visibility>("private")
  const memoOk = state.memoTilesCount > 0 && Boolean(state.memoCaption)
  const itineraryOk = state.itineraryDays.length > 0
  const budgetOk = Boolean(state.budget)
  const canAccept = Boolean(acceptanceEnabled) && memoOk && itineraryOk && budgetOk

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 pr-1">
      <header>
        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Step 5 · Final review</div>
        <h2 className="mt-2 font-display text-[22px] tracking-tight text-primary">
          Review and accept your plan
        </h2>
        <p className="mt-1 text-[13px] leading-relaxed text-foreground/75">
          Skim the summary below, choose how you want to share it, then accept to save it as a real trip.
        </p>
      </header>

      <ul className="space-y-2.5">
        <DocCheckRow
          title="Trip Memo"
          ok={memoOk}
          summary={memoOk ? `${state.memoTilesCount} tiles · ${state.memoItemCount} items` : "Empty"}
          detail={state.memoCaption ?? "No caption yet — ask the assistant to draft one."}
        />
        <DocCheckRow
          title="Full Itinerary"
          ok={itineraryOk}
          summary={itineraryOk ? `${state.itineraryDays.length} days mapped` : "No days yet"}
          detail={
            itineraryOk
              ? `Day 1 — ${state.itineraryDays[0].name}, Day ${state.itineraryDays.length} — ${
                  state.itineraryDays[state.itineraryDays.length - 1].name
                }`
              : "Ask the assistant to draft a full plan."
          }
        />
        <DocCheckRow
          title="Budget Plan"
          ok={budgetOk}
          summary={
            budgetOk && state.budget
              ? `Total ${state.budget.total} · Per person ${state.budget.perPerson}`
              : "Not estimated"
          }
          detail={
            budgetOk
              ? "Estimates can be adjusted later from the trip page."
              : "Ask the assistant to estimate spending."
          }
        />
      </ul>

      <section className="rounded-2xl bg-secondary/60 p-4 ring-1 ring-border/70">
        <p className="text-[12.5px] font-medium text-foreground">Visibility</p>
        <div className="mt-2 space-y-2">
          <VisibilityOption
            icon={<Lock className="size-4" aria-hidden />}
            label="Private"
            description="Only you can see it."
            checked={visibility === "private"}
            onChange={() => setVisibility("private")}
          />
          <VisibilityOption
            icon={<Users className="size-4" aria-hidden />}
            label="Invite only"
            description="Visible to participants you invite."
            checked={visibility === "invite_only"}
            onChange={() => setVisibility("invite_only")}
          />
          <VisibilityOption
            icon={<Globe2 className="size-4" aria-hidden />}
            label="Public"
            description="Appears in Explore and counts toward likes/saves."
            checked={visibility === "public"}
            onChange={() => setVisibility("public")}
          />
        </div>
      </section>

      <div className="mt-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2.5 text-[13px] font-medium text-foreground ring-1 ring-border hover:bg-secondary"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Back to assistant
        </button>
        <button
          type="button"
          disabled={!canAccept}
          title={canAccept ? "" : acceptanceReason || "Planner documents are incomplete."}
          onClick={() => onAccept?.(visibility)}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-[13.5px] font-medium text-primary-foreground ring-1 ring-primary/20 disabled:cursor-not-allowed disabled:bg-secondary disabled:text-muted-foreground"
        >
          <CheckCircle2 className="size-4" aria-hidden />
          Accept Plan
          <ArrowRight className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  )
}

function DocCheckRow({
  title,
  ok,
  summary,
  detail,
}: {
  title: string
  ok: boolean
  summary: string
  detail?: string
}) {
  const tone = ok
    ? "bg-[color:var(--color-success)]/15 text-[color:var(--color-success)]"
    : "bg-secondary text-muted-foreground"
  const label = ok ? "Valid" : "Empty"
  return (
    <li className="flex items-start gap-3 rounded-2xl bg-card p-3.5 ring-1 ring-border/70">
      <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${tone}`}>
        <CheckCircle2 className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="font-display text-[16px] tracking-tight text-primary">{title}</p>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${tone}`}>{label}</span>
        </div>
        <p className="mt-0.5 text-[12.5px] text-foreground/80">{summary}</p>
        {detail && <p className="mt-1 text-[11.5px] text-muted-foreground">{detail}</p>}
      </div>
    </li>
  )
}

function VisibilityOption({
  icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode
  label: string
  description: string
  checked?: boolean
  onChange: () => void
}) {
  return (
    <label
      className={
        checked
          ? "flex cursor-pointer items-start gap-3 rounded-xl bg-card p-2.5 ring-2 ring-primary"
          : "flex cursor-pointer items-start gap-3 rounded-xl bg-card p-2.5 ring-1 ring-border hover:ring-primary/40"
      }
    >
      <input type="radio" name="visibility" checked={checked} onChange={onChange} className="sr-only" />
      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-secondary text-primary ring-1 ring-border">
        {icon}
      </span>
      <span className="flex-1">
        <span className="block text-[12.5px] font-medium text-foreground">{label}</span>
        <span className="mt-0.5 block text-[11.5px] text-muted-foreground">{description}</span>
      </span>
    </label>
  )
}
