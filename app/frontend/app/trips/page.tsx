import Image from "next/image"
import Link from "next/link"
import { ArrowUpRight, Calendar, Plus, Users } from "lucide-react"
import { AppHeader } from "@/components/app-header"
import { AppFooter } from "@/components/app-footer"
import { JOINED_TRIPS, MY_TRIPS, type MyTrip } from "@/lib/data"
import { VisibilityBadge } from "@/components/visibility-badge"

export default function MyTripsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader active="trips" />
      <main className="mx-auto w-full max-w-[1480px] flex-1 px-6 py-10 md:px-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Your plans</div>
            <h1 className="mt-3 font-display text-[44px] leading-[1.04] tracking-[-0.02em] text-primary">
              My trips
            </h1>
            <p className="mt-3 max-w-xl text-[14.5px] leading-relaxed text-foreground/75">
              Resume drafts, revisit accepted itineraries, and find trips you joined through invites.
            </p>
          </div>
          <Link
            href="/new"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-[14px] font-medium text-primary-foreground hover:bg-[#0b2a25]"
          >
            <Plus className="size-4" aria-hidden />
            Start a new trip
          </Link>
        </div>

        {/* Owned */}
        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="font-display text-[24px] tracking-tight text-primary">Owned by you</h2>
            <span className="text-[13px] text-muted-foreground">{MY_TRIPS.length} trips</span>
          </div>
          {MY_TRIPS.length === 0 ? (
            <EmptyState
              title="No accepted trips yet."
              description="Start with images or saved inspiration to draft your first plan."
              action={{ href: "/new", label: "Start a trip" }}
            />
          ) : (
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {MY_TRIPS.map((t) => (
                <li key={t.id}>
                  <MyTripCard trip={t} owned />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Joined */}
        <section className="mt-12">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="font-display text-[24px] tracking-tight text-primary">Joined through invites</h2>
            <span className="text-[13px] text-muted-foreground">{JOINED_TRIPS.length} trips</span>
          </div>
          {JOINED_TRIPS.length === 0 ? (
            <EmptyState
              title="No joined trips yet."
              description="Open an invite link from a friend to view their accepted trip."
            />
          ) : (
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {JOINED_TRIPS.map((t) => (
                <li key={t.id}>
                  <MyTripCard trip={t} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <AppFooter />
    </div>
  )
}

function MyTripCard({ trip, owned }: { trip: MyTrip; owned?: boolean }) {
  return (
    <Link
      href={owned ? `/trips/${trip.id}?as=owner` : `/trips/${trip.id}`}
      className="group flex flex-col overflow-hidden rounded-3xl bg-card ring-1 ring-border transition hover:ring-primary/40"
    >
      <div className="relative aspect-[16/9]">
        <Image src={trip.cover || "/placeholder.svg"} alt="" fill sizes="33vw" className="object-cover" />
        <div className="absolute left-3 top-3">
          <VisibilityBadge visibility={trip.visibility} />
        </div>
        {trip.status === "draft" ? (
          <span className="absolute right-3 top-3 inline-flex items-center rounded-full bg-[color:var(--color-sunset-wash)]/80 px-2.5 py-1 text-[11px] font-medium text-[color:var(--color-warning)]">
            Draft
          </span>
        ) : (
          <span className="absolute right-3 top-3 inline-flex items-center rounded-full bg-[color:var(--color-success)]/15 px-2.5 py-1 text-[11px] font-medium text-[color:var(--color-success)]">
            Accepted
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-[20px] leading-tight tracking-tight text-primary">{trip.title}</h3>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          {trip.days} days · {trip.estBudget}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Calendar className="size-3.5" aria-hidden />
            {trip.updated}
          </span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <Users className="size-3.5" aria-hidden />
            {trip.participants} {trip.participants === 1 ? "participant" : "participants"}
          </span>
        </div>
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-4 text-[12.5px]">
          <span className="text-muted-foreground">By {trip.ownerName}</span>
          <span className="inline-flex items-center gap-1 font-medium text-primary group-hover:underline">
            Open
            <ArrowUpRight className="size-3.5" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  )
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: { href: string; label: string }
}) {
  return (
    <div className="rounded-3xl bg-secondary/40 p-10 text-center ring-1 ring-border">
      <p className="font-display text-[22px] tracking-tight text-primary">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-muted-foreground">{description}</p>
      {action && (
        <Link
          href={action.href}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-[13px] font-medium text-primary-foreground hover:bg-[#0b2a25]"
        >
          {action.label}
        </Link>
      )}
    </div>
  )
}
