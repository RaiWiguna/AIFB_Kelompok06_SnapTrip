import Image from "next/image"
import { Clock, MapPin, Navigation, Utensils, Wallet } from "lucide-react"
import type { TripDetailFull } from "@/lib/trip-detail"

/** Shared full-itinerary body. Used by /trips/[id]/itinerary and /plan/[id]/itinerary. */
export function TripItineraryBody({ detail }: { detail: TripDetailFull }) {
  return (
    <ol className="mt-10 flex flex-col gap-6">
      {detail.itinerary.map((day) => (
        <li key={day.day} className="overflow-hidden rounded-3xl bg-card ring-1 ring-border/70">
          <div className="grid grid-cols-1 md:grid-cols-[260px_minmax(0,1fr)]">
            <div className="relative aspect-[16/10] md:aspect-auto md:min-h-[260px]">
              <Image src={day.cover} alt={day.title} fill className="object-cover" sizes="260px" />
              <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-card/90 px-3 py-1 text-[11.5px] font-medium uppercase tracking-[0.06em] text-foreground ring-1 ring-border/70 backdrop-blur">
                Day {day.day}
              </span>
            </div>
            <div className="p-6 md:p-7">
              <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                {day.dateLabel}
              </p>
              <h2 className="mt-1 font-display text-[26px] leading-tight tracking-[-0.01em] text-primary">
                {day.title}
              </h2>
              <p className="mt-2 max-w-xl text-[13.5px] leading-relaxed text-foreground/75">{day.description}</p>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {day.highlights.map((h) => (
                  <span
                    key={h}
                    className="rounded-full bg-secondary/70 px-3 py-1 text-[11.5px] font-medium text-foreground/80 ring-1 ring-border/60"
                  >
                    {h}
                  </span>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px]">
                <Meta icon={<Navigation className="size-3.5" aria-hidden />}>
                  {day.transport.mode} · {day.transport.from} → {day.transport.to} · {day.transport.durationLabel}
                </Meta>
                <Meta icon={<MapPin className="size-3.5" aria-hidden />}>
                  Stay: {day.accommodation.name} · {day.accommodation.area}
                  {day.accommodation.nights > 0 ? ` · ${day.accommodation.nights} night` : ""}
                </Meta>
                <Meta icon={<Wallet className="size-3.5" aria-hidden />}>
                  Est. {day.estCost.value}
                  {day.estCost.note ? ` · ${day.estCost.note}` : ""}
                </Meta>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                <div>
                  <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                    Daily plan
                  </p>
                  <ol className="relative mt-3 ml-1 space-y-3 border-l border-border/70 pl-4">
                    {day.activities.map((a, i) => (
                      <li key={i} className="relative">
                        <span
                          aria-hidden
                          className="absolute -left-[21px] top-1 size-2.5 rounded-full bg-primary ring-2 ring-card"
                        />
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <span className="inline-flex items-center gap-1 text-[12.5px] font-medium text-foreground">
                            <Clock className="size-3 text-muted-foreground" aria-hidden />
                            {a.time}
                          </span>
                          <span className="text-[14px] font-medium text-foreground">{a.title}</span>
                          {a.duration ? (
                            <span className="text-[12px] text-muted-foreground">· {a.duration}</span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-[13px] leading-relaxed text-foreground/75">{a.detail}</p>
                        {a.location ? (
                          <span className="mt-1 inline-flex items-center gap-1 text-[12px] text-muted-foreground">
                            <MapPin className="size-3" aria-hidden />
                            {a.location}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                </div>

                <aside className="rounded-2xl bg-secondary/40 p-4 ring-1 ring-border/60">
                  <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Meals</p>
                  <ul className="mt-3 flex flex-col gap-2 text-[13px]">
                    {day.meals?.breakfast ? (
                      <li className="flex items-start gap-2">
                        <Utensils className="mt-0.5 size-3.5 text-foreground/60" aria-hidden />
                        <span>
                          <span className="font-medium text-foreground">Breakfast.</span>{" "}
                          <span className="text-foreground/75">{day.meals.breakfast}</span>
                        </span>
                      </li>
                    ) : null}
                    {day.meals?.lunch ? (
                      <li className="flex items-start gap-2">
                        <Utensils className="mt-0.5 size-3.5 text-foreground/60" aria-hidden />
                        <span>
                          <span className="font-medium text-foreground">Lunch.</span>{" "}
                          <span className="text-foreground/75">{day.meals.lunch}</span>
                        </span>
                      </li>
                    ) : null}
                    {day.meals?.dinner ? (
                      <li className="flex items-start gap-2">
                        <Utensils className="mt-0.5 size-3.5 text-foreground/60" aria-hidden />
                        <span>
                          <span className="font-medium text-foreground">Dinner.</span>{" "}
                          <span className="text-foreground/75">{day.meals.dinner}</span>
                        </span>
                      </li>
                    ) : null}
                  </ul>
                </aside>
              </div>
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}

function Meta({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-foreground/75">
      <span className="text-foreground/60">{icon}</span>
      <span>{children}</span>
    </span>
  )
}
