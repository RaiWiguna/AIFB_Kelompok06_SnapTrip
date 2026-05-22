import type { DestinationStop } from "@/lib/trip-detail"

/**
 * Stylized inline route map. Renders a soft beige rectangle with
 * a Bali-shaped silhouette and pin numbers. Pure CSS/SVG so it
 * stays cohesive with the rest of the surface (no external map tile
 * vendor needed for the mock).
 */
export function TripRouteMap({
  stops,
  variant = "compact",
  className,
}: {
  stops: DestinationStop[]
  variant?: "compact" | "full"
  className?: string
}) {
  const heightClass = variant === "full" ? "aspect-[16/8] md:aspect-[16/7]" : "aspect-[16/9]"

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl ring-1 ring-border/60 ${heightClass} ${className ?? ""}`}
      style={{ background: "linear-gradient(135deg, #efe6d4 0%, #e3d6bc 100%)" }}
      role="img"
      aria-label="Trip route across Bali and Nusa Penida"
    >
      {/* Subtle grid */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.08]" aria-hidden>
        <defs>
          <pattern id="trip-map-grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#1d3a32" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#trip-map-grid)" />
      </svg>

      {/* Bali silhouette + Nusa Penida island */}
      <svg
        viewBox="0 0 100 56"
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 h-full w-full"
        aria-hidden
      >
        <path
          d="M14 26 C 18 18, 30 14, 42 16 C 52 17, 62 14, 72 18 C 82 22, 88 28, 86 34 C 84 40, 74 42, 64 40 C 56 39, 48 42, 40 44 C 30 46, 20 42, 16 36 C 13 32, 12 28, 14 26 Z"
          fill="#cdbb98"
          stroke="#9a8866"
          strokeWidth="0.4"
          opacity="0.85"
        />
        {/* Nusa Penida */}
        <ellipse cx="58" cy="50" rx="6" ry="2.6" fill="#cdbb98" stroke="#9a8866" strokeWidth="0.4" opacity="0.85" />
        {/* Sample dotted route */}
        <polyline
          points="38,32 46,26 60,50 70,30 28,38 50,42"
          fill="none"
          stroke="#1d3a32"
          strokeWidth="0.6"
          strokeDasharray="1.4 1.4"
          opacity="0.55"
        />
      </svg>

      {/* Pins */}
      {stops.map((stop) => (
        <span
          key={stop.order}
          className="absolute z-10 grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground shadow-sm ring-2 ring-card"
          style={{ left: `${stop.pin.x}%`, top: `${stop.pin.y}%` }}
          aria-label={`Stop ${stop.order}: ${stop.name}`}
          title={`${stop.order}. ${stop.name}`}
        >
          {stop.order}
        </span>
      ))}

      {/* Soft label */}
      <span className="absolute right-3 top-3 rounded-full bg-card/70 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.06em] text-foreground/70 ring-1 ring-border/60 backdrop-blur">
        Bali
      </span>
    </div>
  )
}
