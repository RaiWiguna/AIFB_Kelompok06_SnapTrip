import Image from "next/image"
import { CalendarDays, MapPin } from "lucide-react"
import { AppFooter } from "@/components/app-footer"
import { AppHeader } from "@/components/app-header"
import { TripBackLink } from "@/components/trip-back-link"
import { TripRouteMap } from "@/components/trip-route-map"
import { TRIP_DETAIL } from "@/lib/data"
import { getTripDetailFull } from "@/lib/trip-detail"

export default async function TripDestinationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const t = TRIP_DETAIL
  const detail = getTripDetailFull(id)

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader active="trips" />

      <main className="mx-auto w-full max-w-[1180px] flex-1 px-6 pb-20 pt-8 md:px-10">
        <div className="flex items-center justify-between gap-4">
          <TripBackLink tripId={id} />
          <span className="text-[12px] text-muted-foreground">
            {detail.destinations.length} stops · {t.durationDays} days
          </span>
        </div>

        <header className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div>
            <p className="text-[12.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
              Selected Destinations
            </p>
            <h1 className="mt-2 font-display text-[clamp(2rem,3vw,2.8rem)] leading-[1.05] tracking-[-0.02em] text-primary">
              {t.title}
            </h1>
            <p className="mt-3 max-w-md text-[14.5px] leading-relaxed text-foreground/75">
              The route flows clockwise from Ubud through Bali&apos;s east coast, over to Nusa Penida, and back along
              the southern peninsula. Each stop is sized for one travel day unless noted.
            </p>
          </div>
          <div>
            <TripRouteMap stops={detail.destinations} variant="full" />
          </div>
        </header>

        <ol className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          {detail.destinations.map((d) => (
            <li
              key={d.order}
              className="overflow-hidden rounded-3xl bg-card ring-1 ring-border/70"
            >
              <div className="relative aspect-[16/9]">
                <Image src={d.cover} alt={d.name} fill className="object-cover" sizes="(min-width: 768px) 50vw, 100vw" />
                <span
                  aria-hidden
                  className="absolute left-4 top-4 grid size-9 place-items-center rounded-full bg-card/95 text-[14px] font-semibold text-foreground ring-1 ring-border/70 backdrop-blur"
                >
                  {d.order}
                </span>
              </div>
              <div className="p-6">
                <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                  {d.region}
                </p>
                <h2 className="mt-1 font-display text-[24px] leading-tight tracking-[-0.01em] text-primary">
                  {d.name}
                </h2>
                <p className="mt-2 text-[13.5px] leading-relaxed text-foreground/75">{d.blurb}</p>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {d.highlights.map((h) => (
                    <span
                      key={h}
                      className="rounded-full bg-secondary/70 px-3 py-1 text-[11.5px] font-medium text-foreground/80 ring-1 ring-border/60"
                    >
                      {h}
                    </span>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="size-3.5" aria-hidden />
                    {d.days.length === 1 ? `Day ${d.days[0]}` : `Days ${d.days.join(" – ")}`}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3.5" aria-hidden />
                    Stop {d.order} of {detail.destinations.length}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </main>

      <AppFooter />
    </div>
  )
}
