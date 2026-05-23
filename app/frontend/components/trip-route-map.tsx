"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { importLibrary, setOptions } from "@googlemaps/js-api-loader"
import type { DestinationStop } from "@/lib/trip-detail"
import { env } from "@/lib/env"

export function TripRouteMap({
  stops,
  variant = "compact",
  className,
}: {
  stops: DestinationStop[]
  variant?: "compact" | "full"
  className?: string
}) {
  const coordinateStops = useMemo(
    () =>
      stops.filter(
        (stop) =>
          typeof stop.lat === "number" &&
          Number.isFinite(stop.lat) &&
          typeof stop.lng === "number" &&
          Number.isFinite(stop.lng),
      ),
    [stops],
  )
  const [failed, setFailed] = useState(false)
  const handleFailure = useCallback(() => setFailed(true), [])
  const canUseGoogleMap =
    Boolean(env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY) && coordinateStops.length > 0 && !failed

  if (!canUseGoogleMap) {
    return <StaticRouteMap stops={stops} variant={variant} className={className} />
  }

  return (
    <GoogleRouteMap
      stops={stops}
      coordinateStops={coordinateStops}
      variant={variant}
      className={className}
      onFailure={handleFailure}
    />
  )
}

function GoogleRouteMap({
  stops,
  coordinateStops,
  variant,
  className,
  onFailure,
}: {
  stops: DestinationStop[]
  coordinateStops: DestinationStop[]
  variant: "compact" | "full"
  className?: string
  onFailure: () => void
}) {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const heightClass = variant === "full" ? "aspect-[16/8] md:aspect-[16/7]" : "aspect-[16/9]"

  useEffect(() => {
    let cancelled = false
    setOptions({
      key: env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY,
    })

    async function renderMap() {
      try {
        const { Map, Polyline } = (await importLibrary("maps")) as google.maps.MapsLibrary
        const { LatLngBounds } = (await importLibrary("core")) as google.maps.CoreLibrary
        const { AdvancedMarkerElement } = (await importLibrary("marker")) as google.maps.MarkerLibrary
        if (cancelled || !mapRef.current) return
        const bounds = new LatLngBounds()
        const first = coordinateStops[0]
        const map = new Map(mapRef.current, {
          center: { lat: first.lat as number, lng: first.lng as number },
          zoom: coordinateStops.length === 1 ? 11 : 8,
          disableDefaultUI: true,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          gestureHandling: "cooperative",
        })

        coordinateStops.forEach((stop) => {
          const position = { lat: stop.lat as number, lng: stop.lng as number }
          bounds.extend(position)
          new AdvancedMarkerElement({
            map,
            position,
            title: `${stop.order}. ${stop.name}`,
            content: markerContent(stop.order),
          })
        })

        if (coordinateStops.length > 1) {
          new Polyline({
            map,
            path: coordinateStops.map((stop) => ({ lat: stop.lat as number, lng: stop.lng as number })),
            geodesic: true,
            strokeColor: "#1d3a32",
            strokeOpacity: 0.7,
            strokeWeight: 2,
          })
          map.fitBounds(bounds, 48)
        }
      } catch {
        if (!cancelled) onFailure()
      }
    }

    renderMap()
    return () => {
      cancelled = true
    }
  }, [coordinateStops, onFailure])

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl ring-1 ring-border/60 ${heightClass} ${className ?? ""}`}
      role="img"
      aria-label={mapLabel(stops)}
    >
      <div ref={mapRef} className="absolute inset-0" />
    </div>
  )
}

function StaticRouteMap({
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
      aria-label={mapLabel(stops)}
    >
      <svg className="absolute inset-0 h-full w-full opacity-[0.08]" aria-hidden>
        <defs>
          <pattern id="trip-map-grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#1d3a32" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#trip-map-grid)" />
      </svg>

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
        <ellipse cx="58" cy="50" rx="6" ry="2.6" fill="#cdbb98" stroke="#9a8866" strokeWidth="0.4" opacity="0.85" />
        <polyline
          points={stops.map((stop) => `${stop.pin.x},${stop.pin.y}`).join(" ")}
          fill="none"
          stroke="#1d3a32"
          strokeWidth="0.6"
          strokeDasharray="1.4 1.4"
          opacity="0.55"
        />
      </svg>

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

      <span className="absolute right-3 top-3 rounded-full bg-card/70 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.06em] text-foreground/70 ring-1 ring-border/60 backdrop-blur">
        Indonesia
      </span>
    </div>
  )
}

function mapLabel(stops: DestinationStop[]) {
  if (!stops.length) return "Trip route map"
  return `Trip route: ${stops.map((stop) => stop.name).join(", ")}`
}

function markerContent(order: number) {
  const marker = document.createElement("span")
  marker.textContent = String(order)
  marker.style.display = "grid"
  marker.style.width = "24px"
  marker.style.height = "24px"
  marker.style.placeItems = "center"
  marker.style.borderRadius = "999px"
  marker.style.background = "#1d3a32"
  marker.style.color = "#fffaf3"
  marker.style.fontSize = "11px"
  marker.style.fontWeight = "700"
  marker.style.boxShadow = "0 2px 8px rgba(29, 36, 32, 0.25)"
  return marker
}
