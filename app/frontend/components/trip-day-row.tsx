"use client"

import { useState } from "react"
import { ChevronDown, Clock, MapPin, Navigation } from "lucide-react"
import type { DayPlan } from "@/lib/trip-detail"

const TRANSPORT_LABEL: Record<DayPlan["transport"]["mode"], string> = {
  Drive: "Drive",
  Ferry: "Ferry",
  Walk: "Walk",
  Scooter: "Scooter",
  Speedboat: "Speedboat",
  Flight: "Flight",
}

/**
 * Single row in the "Full Itinerary" card. Collapsed by default;
 * expands inline to show a compact activity timeline + transport line.
 */
export function TripDayRow({ day, isFirst, isLast }: { day: DayPlan; isFirst: boolean; isLast: boolean }) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`${isFirst ? "" : "border-t border-border/60"}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={`day-${day.day}-detail`}
        className="flex w-full items-center gap-4 px-1 py-3 text-left transition-colors hover:bg-secondary/40"
      >
        <span className="w-12 shrink-0 text-[12.5px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
          Day {day.day}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block truncate text-[14px] font-medium text-foreground">{day.title}</span>
          <span className="block truncate text-[12.5px] text-muted-foreground">{day.summary}</span>
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && (
        <div id={`day-${day.day}-detail`} className="px-1 pb-4 pt-1">
          <div className="rounded-2xl bg-secondary/40 p-4 ring-1 ring-border/60">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                {day.dateLabel}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-[11.5px] text-foreground/75 ring-1 ring-border/60">
                <Navigation className="size-3" aria-hidden />
                {TRANSPORT_LABEL[day.transport.mode]} · {day.transport.from} → {day.transport.to} ·{" "}
                {day.transport.durationLabel}
              </span>
            </div>

            <ol className="relative ml-1 space-y-2.5 border-l border-border/70 pl-4">
              {day.activities.map((a, i) => (
                <li key={i} className="relative">
                  <span
                    aria-hidden
                    className="absolute -left-[21px] top-1 size-2.5 rounded-full bg-primary ring-2 ring-card"
                  />
                  <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                    <span className="inline-flex items-center gap-1 text-[12px] font-medium text-foreground">
                      <Clock className="size-3 text-muted-foreground" aria-hidden />
                      {a.time}
                    </span>
                    <span className="text-[13px] font-medium text-foreground">{a.title}</span>
                    {a.duration ? (
                      <span className="text-[11.5px] text-muted-foreground">· {a.duration}</span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-foreground/75">{a.detail}</p>
                  {a.location ? (
                    <span className="mt-1 inline-flex items-center gap-1 text-[11.5px] text-muted-foreground">
                      <MapPin className="size-3" aria-hidden />
                      {a.location}
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {/* keep last row visually closed */}
      {isLast && !open ? null : null}
    </div>
  )
}
