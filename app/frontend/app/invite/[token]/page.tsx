import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, Eye, Lock, Pencil, ShieldOff, Users } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { IMG_ALIAS, getInvite } from "@/lib/data"

type Role = "viewer" | "editor"

function RoleBadge({ role }: { role: Role }) {
  if (role === "editor") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11.5px] font-medium text-primary ring-1 ring-primary/20">
        <Pencil className="size-3" aria-hidden />
        Editor
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11.5px] font-medium text-foreground ring-1 ring-border">
      <Eye className="size-3" aria-hidden />
      Viewer
    </span>
  )
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const invite = getInvite(token)
  if (!invite) notFound()

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px]">
        <Image src={IMG_ALIAS.sunsetGate || "/placeholder.svg"} alt="" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/55 via-primary/30 to-background" />
      </div>

      <SiteHeader tone="light" />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-6 pb-24 pt-16 md:pt-24">
        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-soft-accent">
          You&apos;re invited to a SnapTrip plan
        </div>

        <div className="mt-6 w-full rounded-3xl bg-card p-7 ring-1 ring-border/70 shadow-[0_40px_120px_-40px_rgba(29,36,32,0.5)] md:p-9">
          <div className="flex items-start gap-4">
            <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl ring-1 ring-border/70">
              <Image src={invite.cover || "/placeholder.svg"} alt="" fill sizes="80px" className="object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
                <span>Invited by</span>
                <span className="font-medium text-foreground">{invite.inviterName}</span>
              </div>
              <h1 className="mt-1 font-display text-[clamp(1.6rem,3.5vw,2.2rem)] leading-tight tracking-tight text-primary text-balance">
                {invite.tripTitle}
              </h1>
              <div className="mt-2 text-[13px] text-muted-foreground">
                {invite.days} days · {invite.dates} · {invite.region}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2 text-[12.5px]">
            <RoleBadge role={invite.role as Role} />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 ring-1 ring-border">
              <Users className="size-3" aria-hidden />
              {invite.participants} {invite.participants === 1 ? "participant" : "participants"}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 ring-1 ring-border">
              <Lock className="size-3" aria-hidden />
              Private link
            </span>
          </div>

          {/* State-specific block */}
          {invite.state === "valid" && (
            <div className="mt-7">
              <div className="rounded-2xl bg-secondary/60 p-4 ring-1 ring-border/70">
                <p className="text-[13.5px] leading-relaxed text-foreground/80">
                  By accepting, you&apos;ll be able to{" "}
                  {invite.role === "editor" ? "view and edit" : "view"} this trip plan, see the full
                  itinerary, and follow updates from {invite.inviterName.split(" ")[0]}.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                <div className="inline-flex items-center gap-2 text-[12.5px] text-muted-foreground">
                  <Clock className="size-3.5" aria-hidden />
                  Link expires {invite.expiresIn}
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href="/explore"
                    className="rounded-full bg-secondary px-4 py-2 text-[13px] font-medium ring-1 ring-border hover:bg-secondary/70"
                  >
                    Decline
                  </Link>
                  <Link
                    href={`/trips/${invite.tripId}`}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-[13px] font-medium text-primary-foreground hover:bg-[#0b2a25]"
                  >
                    Accept invitation
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {invite.state === "joined" && (
            <StateBlock
              tone="success"
              icon={<CheckCircle2 className="size-5" aria-hidden />}
              title="You're already part of this trip"
              body="You accepted this invitation earlier. Jump back to the plan to keep collaborating."
              cta={{ href: `/trips/${invite.tripId}`, label: "Open trip" }}
            />
          )}

          {invite.state === "expired" && (
            <StateBlock
              tone="warning"
              icon={<Clock className="size-5" aria-hidden />}
              title="This invitation has expired"
              body={`Invitations are valid for a limited time. Ask ${invite.inviterName.split(" ")[0]} to send a fresh link if you'd still like to join.`}
              cta={{ href: "/explore", label: "Browse Explore instead" }}
            />
          )}

          {invite.state === "revoked" && (
            <StateBlock
              tone="error"
              icon={<ShieldOff className="size-5" aria-hidden />}
              title="This invitation was revoked"
              body={`The trip owner removed access for this link. If you think that's a mistake, reach out to ${invite.inviterName.split(" ")[0]} directly.`}
              cta={{ href: "/explore", label: "Browse Explore" }}
            />
          )}

          {invite.state === "invalid" && (
            <StateBlock
              tone="error"
              icon={<AlertTriangle className="size-5" aria-hidden />}
              title="This invitation link is invalid"
              body="The link may have been mistyped or the trip is no longer available. Double-check the URL with the person who sent it."
              cta={{ href: "/", label: "Back to home" }}
            />
          )}
        </div>

        <p className="mt-6 max-w-md text-center text-[12px] leading-relaxed text-muted-foreground">
          SnapTrip never publishes your private trips. Joining only gives you access to this plan&apos;s memo,
          itinerary, and budget.
        </p>
      </main>

      <SiteFooter />
    </div>
  )
}

function StateBlock({
  tone,
  icon,
  title,
  body,
  cta,
}: {
  tone: "success" | "warning" | "error"
  icon: React.ReactNode
  title: string
  body: string
  cta: { href: string; label: string }
}) {
  const map = {
    success: {
      bg: "bg-success/10",
      ring: "ring-success/25",
      text: "text-success",
    },
    warning: {
      bg: "bg-soft-accent/40",
      ring: "ring-accent/25",
      text: "text-accent",
    },
    error: {
      bg: "bg-destructive/10",
      ring: "ring-destructive/25",
      text: "text-destructive",
    },
  }[tone]

  return (
    <div className="mt-7">
      <div className={`flex items-start gap-3 rounded-2xl ${map.bg} p-4 ring-1 ${map.ring}`}>
        <span className={`grid size-9 place-items-center rounded-full bg-card ${map.text} ring-1 ring-border/70`}>
          {icon}
        </span>
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-foreground">{title}</div>
          <p className="mt-1 text-[13px] leading-relaxed text-foreground/75">{body}</p>
        </div>
      </div>
      <div className="mt-5 flex justify-end">
        <Link
          href={cta.href}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-[13px] font-medium text-primary-foreground hover:bg-[#0b2a25]"
        >
          {cta.label}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </div>
  )
}
