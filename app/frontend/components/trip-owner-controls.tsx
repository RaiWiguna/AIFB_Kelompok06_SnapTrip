import Link from "next/link"
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

type Visibility = "private" | "invite" | "public"

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
  visibility = "invite",
  invitesActive = 1,
  isPublished = false,
}: {
  tripId: string
  visibility?: Visibility
  invitesActive?: number
  isPublished?: boolean
}) {
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
            active={visibility === "private"}
          />
          <VisibilitySegment
            label="Invite"
            icon={<Users className="size-3.5" aria-hidden />}
            active={visibility === "invite"}
          />
          <VisibilitySegment
            label="Public"
            icon={<Globe2 className="size-3.5" aria-hidden />}
            active={visibility === "public"}
          />
        </div>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">
          {visibility === "private" && "Only you can see this trip."}
          {visibility === "invite" && "Visible to participants you invite."}
          {visibility === "public" && "Discoverable in Explore."}
        </p>
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
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-3 py-2 text-[12.5px] font-medium text-primary-foreground hover:bg-[#0b2a25]"
        >
          <Globe2 className="size-3.5" aria-hidden />
          {isPublished ? "Unpublish" : "Publish"}
        </button>
        <Link
          href={`/plan/${tripId}`}
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
}: {
  label: string
  icon: React.ReactNode
  active?: boolean
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active ? "true" : "false"}
      className={
        active
          ? "inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-[12px] font-medium text-foreground ring-1 ring-border/70"
          : "inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground"
      }
    >
      {icon}
      {label}
    </button>
  )
}
