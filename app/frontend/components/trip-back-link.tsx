import Link from "next/link"
import { ArrowLeft } from "lucide-react"

/**
 * Compact "back" pill used on all /trips/[id]/* and /plan/[id]/* sub-pages.
 * Defaults to the trip overview but accepts a custom href + label for the planner.
 */
export function TripBackLink({
  tripId,
  href,
  label = "Back to trip",
}: {
  tripId?: string
  href?: string
  label?: string
}) {
  const target = href ?? (tripId ? `/trips/${tripId}` : "/trips")
  return (
    <Link
      href={target}
      className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 text-[13px] font-medium text-foreground/80 ring-1 ring-border/70 transition-colors hover:bg-secondary hover:text-foreground"
    >
      <ArrowLeft className="size-4" aria-hidden />
      {label}
    </Link>
  )
}
