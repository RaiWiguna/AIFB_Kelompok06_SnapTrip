import Image from "next/image"
import Link from "next/link"
import section2Bg from "@/public/landing/section2-bg.png"
import { ArrowRight, Bookmark, Calendar, Heart, ShieldCheck, Star, Wallet } from "lucide-react"
import { IMG, TRIPS } from "@/lib/data"
import { cn } from "@/lib/utils"
import { LandingSection, Reveal, Sheen, Stagger, StaggerItem } from "@/components/landing/landing-motion"

function fmt(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n)
}

const FEATURED = [
  { ...TRIPS[0], cover: IMG.landingCardBaliVolcanicCoast }, // Editor's pick — Bali's Volcanic Coast
  { ...TRIPS[7], cover: IMG.landingCardMountBaturSunrise }, // Sunrise Hike Mount Batur
  { ...TRIPS[8], cover: IMG.landingCardNorthBaliWaterfalls }, // Hidden Waterfalls of North Bali
  { ...TRIPS[9], cover: IMG.landingCardPinkBeachLabuanBajo }, // Pink Beach Escape Labuan Bajo
  { ...TRIPS[10], cover: IMG.landingCardUbudCulture }, // Ubud Culture & Heritage Walk
  { ...TRIPS[11], cover: IMG.landingCardIjenBlueFire }, // Ijen Blue Fire Adventure
]

export function FindTripsSection() {
  const featured = FEATURED[0]
  const small = FEATURED.slice(1)

  return (
    <LandingSection className="relative overflow-hidden bg-background py-16 md:flex md:min-h-[125svh] md:items-center md:py-8">
      <div aria-hidden className="absolute inset-0 h-full w-full">
        <Image
          src={section2Bg}
          alt=""
          fill
          sizes="100vw"
          className="h-full w-full object-cover"
          priority={false}
        />
      </div>
      <Sheen className="opacity-35" />

      <div className="relative mx-auto grid w-full max-w-[1520px] grid-cols-1 gap-8 px-6 md:grid-cols-[330px_minmax(0,1fr)] md:items-center md:px-10">
        {/* Left: title */}
        <Reveal className="md:-translate-x-[9%] md:-translate-y-[45%]" direction="right">
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">
            02 / Discovery
          </div>
          <h2 className="mt-5 font-display text-[clamp(2.4rem,4vw,3.6rem)] leading-[1.05] tracking-tight text-primary">
            Find trips
            <br />
            worth saving.
          </h2>
          <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
            Browse public plans across coast, mountain, waterfall, and cultural
            destinations.
          </p>
          <div className="mt-10 flex items-center gap-3 text-muted-foreground">
            <span className="grid size-12 place-items-center rounded-full ring-1 ring-border">
              <CircleStamp />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em]">
              Public plans · Curated by travelers
            </span>
          </div>
        </Reveal>

        {/* Right: bento grid */}
        <Reveal direction="left" delay={0.1}>
          <Stagger className="grid grid-cols-1 gap-5 md:grid-cols-3 md:items-start">
            <StaggerItem className="space-y-5">
              <DarkCard trip={featured} className="h-[420px] md:h-[430px]" />
              <DarkCard trip={small[2]} compact className="h-[190px] md:h-[200px]" />
            </StaggerItem>

            <StaggerItem className="space-y-5">
              <DarkCard trip={small[0]} compact className="h-[250px] md:h-[240px]" />
              <DarkCard trip={small[3]} compact className="h-[330px] md:h-[390px]" />
            </StaggerItem>

            <StaggerItem className="space-y-5">
              <DarkCard trip={small[1]} compact className="h-[420px] md:h-[430px]" />
              <DarkCard trip={small[4]} compact className="h-[190px] md:h-[200px]" />
            </StaggerItem>
          </Stagger>

          <Reveal className="mt-6 flex justify-center" delay={0.18}>
            <Link
              href="/explore"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-card px-5 py-3 text-[14px] font-medium text-foreground ring-1 ring-border transition duration-300 hover:-translate-y-0.5 hover:bg-secondary active:translate-y-0"
            >
              <Compass />
              Explore more public trips
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Reveal>
        </Reveal>
      </div>
    </LandingSection>
  )
}

function DarkCard({
  trip,
  small,
  compact,
  className,
}: {
  trip: (typeof TRIPS)[number]
  small?: boolean
  compact?: boolean
  className?: string
}) {
  const isSmall = small || compact

  return (
    <Link
      href={`/trips/${trip.id}`}
      className={cn(
        "group relative block overflow-hidden rounded-[22px] transition duration-700 hover:-translate-y-1",
        "shadow-[0_24px_60px_-30px_rgba(11,42,37,0.5)] ring-1 ring-black/5",
        isSmall ? "min-h-[180px]" : "min-h-[360px] md:min-h-[390px]",
        className,
      )}
    >
      <Image
        src={trip.cover || "/placeholder.svg"}
        alt={trip.title}
        fill
        sizes="(max-width: 768px) 100vw, 50vw"
        className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-night/85 via-night/20 to-night/15"
      />

      {/* Top-right: bookmark / heart */}
      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3.5">
        {trip.editorPick ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-night/55 px-2.5 py-1 text-[11px] font-medium text-mist backdrop-blur-md">
            <Star className="size-3 fill-warning text-warning" aria-hidden />
            Editor’s Pick
          </span>
        ) : (
          <span />
        )}
        <span
          aria-hidden
          className={cn(
            "grid size-9 place-items-center rounded-full backdrop-blur-md",
            trip.liked
              ? "bg-accent text-accent-foreground"
              : "bg-night/45 text-mist",
          )}
        >
          {trip.liked ? (
            <Heart className="size-4 fill-current" aria-hidden />
          ) : (
            <Bookmark className="size-4" aria-hidden />
          )}
        </span>
      </div>

      {/* Bottom block */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 p-5",
            isSmall ? "p-3.5" : "p-6",
        )}
      >
        <div className="mb-3 flex items-center gap-2">
          <span className="size-7 overflow-hidden rounded-full ring-2 ring-mist/30">
            <Image
              src={trip.owner.avatar || "/placeholder.svg"}
              alt=""
              width={28}
              height={28}
              className="size-7"
              unoptimized
            />
          </span>
          <span className="text-[13px] font-medium text-mist">{trip.owner.name}</span>
          {trip.owner.verified ? (
            <ShieldCheck className="size-3.5 text-soft-accent" aria-hidden />
          ) : null}
        </div>

        <h3
          className={cn(
            "font-display leading-[1.1] text-mist",
            isSmall ? "text-[20px]" : "text-[34px]",
          )}
        >
          {trip.title}
        </h3>
        {!isSmall && trip.region ? (
          <p className="mt-2 text-[13px] text-mist/75">{trip.region}</p>
        ) : null}

        {/* Stats strip */}
        <div className="mt-4 flex items-center gap-4 text-[12.5px] text-mist/75">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="size-3.5" aria-hidden />
            {trip.days} days
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Wallet className="size-3.5" aria-hidden />
            {trip.budget}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Heart className="size-3.5" aria-hidden />
            {fmt(trip.likes)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Bookmark className="size-3.5" aria-hidden />
            {fmt(trip.saves)}
          </span>
        </div>
      </div>
    </Link>
  )
}

function Compass() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m14.5 9.5-2.5 5-5 2.5 2.5-5 5-2.5z" />
    </svg>
  )
}

function CircleStamp() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden>
      <circle cx="18" cy="18" r="14" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 2" />
      <path
        d="M10 22 L18 14 L26 22"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="18" cy="14" r="1.4" fill="currentColor" />
    </svg>
  )
}
