import Image from "next/image"
import Link from "next/link"
import { Bookmark, Calendar, Heart, ShieldCheck, Star, Wallet } from "lucide-react"
import { TripCardLikeButton } from "@/components/trip-card-like-button"
import { TripCardSaveButton } from "@/components/trip-card-save-button"
import type { TripCardDisplay } from "@/lib/api/types"
import { cn } from "@/lib/utils"

type Variant = "light" | "dark"
type Size = "sm" | "md" | "lg"

const SIZE_RATIO: Record<Size, string> = {
  sm: "aspect-[4/3]",
  md: "aspect-[5/4]",
  lg: "aspect-[16/10]",
}

function formatCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(n)
}

export function TripCard({
  trip,
  variant = "light",
  size = "md",
  className,
  authHref,
}: {
  trip: TripCardDisplay
  variant?: Variant
  size?: Size
  className?: string
  authHref?: string
}) {
  return (
    <Link
      href={`/trips/${trip.id}`}
      className={cn(
        "group relative block overflow-hidden rounded-[20px]",
        "shadow-[0_1px_0_0_rgba(29,36,32,0.04),0_8px_24px_-12px_rgba(29,36,32,0.18)]",
        "ring-1 ring-black/5",
        className,
      )}
    >
      <div className={cn("relative w-full", SIZE_RATIO[size])}>
        <Image
          src={trip.cover || "/placeholder.svg"}
          alt={trip.title}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />
        {/* Bottom darken for text legibility */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent"
        />

        {/* Top row: editor pick + bookmark */}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          {trip.editorPick ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-medium text-foreground shadow-sm ring-1 ring-black/5">
              <Star className="size-3 fill-warning text-warning" aria-hidden />
              Editor’s Pick
            </span>
          ) : (
            <span />
          )}
          <span className="flex items-center gap-2">
            <TripCardLikeButton tripId={trip.id} liked={trip.liked} authHref={authHref} />
            <TripCardSaveButton tripId={trip.id} saved={trip.saved} authHref={authHref} />
          </span>
        </div>

        {/* Bottom: owner + title */}
        <div className="absolute inset-x-0 bottom-0 p-4 text-mist">
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center overflow-hidden rounded-full bg-mist/30 ring-2 ring-mist/40">
              <Image
                src={trip.owner.avatar || "/placeholder.svg"}
                alt=""
                width={24}
                height={24}
                className="size-6 object-cover"
                unoptimized
              />
            </span>
            <span className="text-[13px] font-medium text-mist/95">
              {trip.owner.name}
            </span>
            {trip.owner.verified ? (
              <ShieldCheck className="size-3.5 text-soft-accent" aria-hidden />
            ) : null}
          </div>
          <h3 className="mt-2 font-display text-[22px] leading-[1.15] text-mist">
            {trip.title}
          </h3>
          {trip.region ? (
            <p className="mt-1.5 line-clamp-1 text-[12.5px] text-mist/70">
              {trip.region}
            </p>
          ) : null}
        </div>
      </div>

      {/* Stats footer (light cards only) */}
      {variant === "light" ? (
        <div className="flex items-center justify-between gap-3 border-t border-border/60 bg-card px-4 py-3 text-[12.5px] text-foreground/80">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="size-3.5 text-muted-foreground" aria-hidden />
            {trip.days} days
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Wallet className="size-3.5 text-muted-foreground" aria-hidden />
            {trip.budget}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Heart className="size-3.5 text-muted-foreground" aria-hidden />
            {formatCount(trip.likes)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Bookmark className="size-3.5 text-muted-foreground" aria-hidden />
            {formatCount(trip.saves)}
          </span>
        </div>
      ) : null}
    </Link>
  )
}
