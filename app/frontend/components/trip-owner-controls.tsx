"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import {
  CheckCircle2,
  Eye,
  Globe2,
  Lock,
  Pencil,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react"
import { updateTripVisibility } from "@/lib/api/trip-plans"

type Visibility = "private" | "invite_only" | "public"

/**
 * Compact owner-controls card. Sits in a 2-up row with the
 * Participants card below the Destinations / Memo / Itinerary
 * cards on the trip detail page.
 *
 * Layout:
 *   - Header (title + helper)
 *   - Row 1: Visibility segmented (full width inside card)
 *   - Row 2: Two equal-width chip buttons — Manage invites · Publish
 *   - Row 3: Two equal-width chip buttons — Edit · Preview
 */
export function TripOwnerControls({
  tripId,
  plannerSessionId,
  visibility = "invite_only",
  invitesActive = 1,
}: {
  tripId: string
  plannerSessionId?: string | null
  visibility?: Visibility
  invitesActive?: number
}) {
  const router = useRouter()
  const [currentVisibility, setCurrentVisibility] = useState<Visibility>(visibility)
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()
  const isPublished = currentVisibility === "public"

  function setVisibility(nextVisibility: Visibility) {
    setError("")
    startTransition(async () => {
      try {
        await updateTripVisibility(tripId, nextVisibility)
        setCurrentVisibility(nextVisibility)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not update visibility")
      }
    })
  }

  return (
    <section
      aria-label="Owner controls"
      className="flex h-full flex-col rounded-2xl bg-card p-5 ring-1 ring-border/70"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-secondary text-primary ring-1 ring-border">
            <ShieldCheck className="size-3.5" aria-hidden />
          </span>
          <h2 className="text-[14px] font-semibold text-foreground">
            Owner controls
          </h2>
        </div>
        {isPublished ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10.5px] font-medium text-foreground ring-1 ring-border/60">
            <CheckCircle2 className="size-3" aria-hidden />
            Live
          </span>
        ) : (
          <span className="rounded-full bg-secondary/60 px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground ring-1 ring-border/60">
            Draft
          </span>
        )}
      </div>

      {/* Visibility */}
      <div className="mt-4">
        <GroupLabel>Visibility</GroupLabel>
        <div
          role="radiogroup"
          aria-label="Trip visibility"
          className="mt-1.5 inline-flex w-full rounded-full bg-secondary/60 p-1 ring-1 ring-border/60"
        >
          <VisibilitySegment
            label="Private"
            icon={<Lock className="size-3.5" aria-hidden />}
            active={currentVisibility === "private"}
            disabled={isPending}
            onClick={() => setVisibility("private")}
          />
          <VisibilitySegment
            label="Invite"
            icon={<Users className="size-3.5" aria-hidden />}
            active={currentVisibility === "invite_only"}
            disabled={isPending}
            onClick={() => setVisibility("invite_only")}
          />
          <VisibilitySegment
            label="Public"
            icon={<Globe2 className="size-3.5" aria-hidden />}
            active={currentVisibility === "public"}
            disabled={isPending}
            onClick={() => setVisibility("public")}
          />
        </div>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">
          {currentVisibility === "private" && "Only you can see this trip."}
          {currentVisibility === "invite_only" && "Visible to participants you invite."}
          {currentVisibility === "public" && "Discoverable in Explore."}
        </p>
        {error ? <p className="mt-1 text-[11.5px] text-[color:var(--color-warning)]">{error}</p> : null}
      </div>

      {/* Action chips */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link
          href={`/trips/${tripId}/invite`}
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-secondary/60 px-3 py-2 text-[12.5px] font-medium text-foreground ring-1 ring-border/60 hover:bg-secondary"
        >
          <Send className="size-3.5" aria-hidden />
          Invites
          <span className="rounded-full bg-card px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground ring-1 ring-border/60">
            {invitesActive}
          </span>
        </Link>
        <button
          type="button"
          disabled={isPending}
          onClick={() => setVisibility(isPublished ? "invite_only" : "public")}
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-3 py-2 text-[12.5px] font-medium text-primary-foreground hover:bg-[#0b2a25]"
        >
          <Globe2 className="size-3.5" aria-hidden />
          {isPublished ? "Unpublish" : "Publish"}
        </button>
        <Link
          href={plannerSessionId ? `/plan/${plannerSessionId}` : `/trips/${tripId}?as=owner`}
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-secondary/60 px-3 py-2 text-[12.5px] font-medium text-foreground ring-1 ring-border/60 hover:bg-secondary"
        >
          <Pencil className="size-3.5" aria-hidden />
          Edit
        </Link>
        <Link
          href={`/trips/${tripId}`}
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-secondary/60 px-3 py-2 text-[12.5px] font-medium text-foreground ring-1 ring-border/60 hover:bg-secondary"
          aria-label="Open public preview"
        >
          <Eye className="size-3.5" aria-hidden />
          Preview
        </Link>
      </div>
    </section>
  )
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10.5px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
      {children}
    </p>
  )
}

function VisibilitySegment({
  label,
  icon,
  active,
  disabled,
  onClick,
}: {
  label: string
  icon: React.ReactNode
  active?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active ? "true" : "false"}
      disabled={disabled}
      onClick={onClick}
      className={
        active
          ? "inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-[12px] font-medium text-foreground ring-1 ring-border/70"
          : "inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-60"
      }
    >
      {icon}
      {label}
    </button>
  )
}
