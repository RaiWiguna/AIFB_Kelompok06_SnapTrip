import Image from "next/image"
import Link from "next/link"
import { ChevronDown, Plus, Users } from "lucide-react"
import type { TripParticipant } from "@/lib/trip-detail"

/**
 * Compact, expandable Participants card. Sits next to the
 * (slimmer) Owner controls in the row below the main 3-card row.
 *
 * Collapsed:  avatar stack + total count + "Invite" button.
 * Expanded:   ordered list with role pill, joined label, and a
 *             Manage link to the dedicated invites page.
 */
export function TripParticipants({
  tripId,
  participants,
}: {
  tripId: string
  participants: TripParticipant[]
}) {
  const total = participants.length
  const active = participants.filter((p) => p.status === "active").length
  const pending = total - active
  const visible = participants.slice(0, 5)

  return (
    <section
      aria-label="Participants"
      className="flex h-full flex-col rounded-2xl bg-card ring-1 ring-border/70"
    >
      <details className="group flex h-full flex-col">
        <summary
          className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 [&::-webkit-details-marker]:hidden"
          aria-label={`Show all ${total} participants`}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-secondary text-primary ring-1 ring-border">
              <Users className="size-3.5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-[14px] font-semibold text-foreground">
                Participants{" "}
                <span className="font-normal text-muted-foreground">({total})</span>
              </h2>
              <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
                {active} joined
                {pending > 0 ? ` · ${pending} pending` : ""}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {/* Avatar stack */}
            <ul className="flex -space-x-2" aria-hidden>
              {visible.map((p) => (
                <li key={p.id} className="relative">
                  <Image
                    src={p.avatar}
                    alt=""
                    width={28}
                    height={28}
                    className="size-7 rounded-full bg-secondary ring-2 ring-card"
                    unoptimized
                  />
                  {p.status === "pending" ? (
                    <span
                      aria-hidden
                      className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-[color:var(--color-accent,#d6a25b)] ring-2 ring-card"
                    />
                  ) : null}
                </li>
              ))}
              {total > visible.length ? (
                <li className="grid size-7 place-items-center rounded-full bg-secondary text-[10.5px] font-medium text-muted-foreground ring-2 ring-card">
                  +{total - visible.length}
                </li>
              ) : null}
            </ul>

            <ChevronDown
              className="size-4 text-muted-foreground transition-transform group-open:rotate-180"
              aria-hidden
            />
          </div>
        </summary>

        {/* Expanded list */}
        <div className="border-t border-border/60 px-5 pb-4 pt-3">
          <ul className="divide-y divide-border/50">
            {participants.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2.5">
                <Image
                  src={p.avatar}
                  alt=""
                  width={32}
                  height={32}
                  className="size-8 shrink-0 rounded-full bg-secondary ring-1 ring-border/60"
                  unoptimized
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-foreground">
                    {p.name}
                    {p.status === "pending" ? (
                      <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                        · pending
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-[11.5px] text-muted-foreground">
                    {p.joinedLabel}
                  </p>
                </div>
                <RolePill role={p.role} />
              </li>
            ))}
          </ul>

          <div className="mt-3 flex items-center gap-2">
            <Link
              href={`/trips/${tripId}/invite?new=1`}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-primary px-3 py-2 text-[12.5px] font-medium text-primary-foreground hover:bg-[#0b2a25]"
            >
              <Plus className="size-3.5" aria-hidden />
              Invite people
            </Link>
            <Link
              href={`/trips/${tripId}/invite`}
              className="inline-flex items-center justify-center rounded-full bg-secondary/60 px-3 py-2 text-[12.5px] font-medium text-foreground ring-1 ring-border/60 hover:bg-secondary"
            >
              Manage
            </Link>
          </div>
        </div>

        {/* Collapsed footer: invite shortcut so the card doesn't feel empty */}
        <div className="mt-auto border-t border-border/60 p-3 group-open:hidden">
          <Link
            href={`/trips/${tripId}/invite?new=1`}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-primary px-3 py-2 text-[12.5px] font-medium text-primary-foreground hover:bg-[#0b2a25]"
          >
            <Plus className="size-3.5" aria-hidden />
            Invite people
          </Link>
        </div>
      </details>
    </section>
  )
}

function RolePill({ role }: { role: TripParticipant["role"] }) {
  const isOwner = role === "Owner"
  const cls = isOwner
    ? "bg-primary/10 text-primary ring-primary/20"
    : "bg-secondary/60 text-foreground ring-border/60"
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10.5px] font-medium ring-1 ${cls}`}
    >
      {role}
    </span>
  )
}
