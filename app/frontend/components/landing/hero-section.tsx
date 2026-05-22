import Image from "next/image"
import Link from "next/link"
import heroBg from "@/public/landing/hero-bg.png"
import {
  ArrowRight,
  Bookmark,
  Calculator,
  ChevronDown,
  Compass,
  Layers,
  Lock,
  Sparkles,
} from "lucide-react"
import { IMG, PLAN_DRAFT } from "@/lib/data"
import { SiteHeader } from "@/components/site-header"
import { Float, LandingSection, Reveal, Sheen, Stagger, StaggerItem } from "@/components/landing/landing-motion"

export function HeroSection() {
  return (
    <LandingSection className="relative isolate min-h-[100svh] overflow-hidden bg-background md:min-h-[125svh]">
      {/* Background photo */}
      <div className="absolute inset-0 -z-10">
        <Image
          src={heroBg}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[68%_center]"
        />
        <Sheen className="opacity-45" />
        {/* Soft warm wash so the left side reads cleanly */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(to_right,rgba(247,244,238,0.96)_0%,rgba(247,244,238,0.85)_30%,rgba(247,244,238,0.5)_50%,rgba(247,244,238,0.18)_70%,rgba(247,244,238,0.05)_100%)]"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-background"
        />
      </div>

      <SiteHeader />

      <div className="mx-auto grid w-full max-w-[1480px] grid-cols-1 gap-8 px-6 pb-20 pt-8 md:min-h-[calc(125svh-116px)] md:grid-cols-12 md:items-center md:gap-10 md:px-10 md:py-4">
        {/* Left: editorial copy */}
        <Reveal className="md:col-span-6 md:-translate-y-[35%] md:pt-6" direction="right">
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">
            SnapTrip
          </div>
          <h1 className="mt-6 font-display text-[clamp(2.6rem,5.2vw,4.6rem)] leading-[1.02] tracking-[-0.02em] text-primary text-balance">
            Plan from the places that caught your eye.
          </h1>
          <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-foreground/75 text-pretty">
            SnapTrip turns saved trips and travel images into structured
            Indonesian travel plans, with recommendations, itinerary drafts,
            and budget notes you can review before sharing.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/signin?next=%2Fnew&action=plan"
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-[15px] font-medium text-primary-foreground transition hover:bg-[#0b2a25]"
            >
              <Sparkles className="size-4" aria-hidden />
              Start planning
            </Link>
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 rounded-2xl bg-card px-6 py-3.5 text-[15px] font-medium text-foreground ring-1 ring-border/80 transition hover:bg-secondary"
            >
              <Compass className="size-4" aria-hidden />
              Explore trips
            </Link>
          </div>

          {/* Feature row */}
          <Stagger className="mt-6 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
            <FeatureCard
              icon={<Layers className="size-4" aria-hidden />}
              title="Structured plans"
              note="Clear itineraries you can adjust with ease."
            />
            <FeatureCard
              icon={<Calculator className="size-4" aria-hidden />}
              title="Budget notes"
              note="See estimated costs and trade-offs up front."
            />
            <FeatureCard
              icon={<Lock className="size-4" aria-hidden />}
              title="Private by default"
              note="Your trips stay private until you share."
            />
          </Stagger>
        </Reveal>

        {/* Right: floating cards */}
        <Reveal className="relative md:col-span-6" direction="left" delay={0.1}>
          <div className="relative ml-auto h-[430px] w-full max-w-[620px]">
            {/* Trip Memo card */}
            <Float className="absolute right-2 top-2 w-[440px] rounded-[22px] bg-card/95 p-4 shadow-[0_24px_70px_-30px_rgba(29,36,32,0.45)] ring-1 ring-black/5 backdrop-blur-sm" amplitude={8}>
              <div className="mb-3 flex items-center justify-between">
                <div className="inline-flex items-center gap-2 text-[14px] font-medium text-foreground">
                  <Bookmark className="size-4 text-primary" aria-hidden />
                  Trip Memo
                  <Sparkles className="size-3.5 text-accent" aria-hidden />
                </div>
                <button className="text-[12.5px] text-muted-foreground hover:text-primary">
                  View all
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[IMG.diamondBeach, IMG.baliCoastalPano, IMG.bromoTengger, IMG.baliWomanTemple].map(
                  (src, i) => (
                    <div
                      key={i}
                      className="relative aspect-square overflow-hidden rounded-xl ring-1 ring-black/5"
                    >
                      <Image
                        src={src || "/placeholder.svg"}
                        alt=""
                        fill
                        sizes="120px"
                        className="object-cover"
                      />
                    </div>
                  ),
                )}
              </div>
              <div className="mt-3.5 flex items-center justify-between">
                <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                  Saved from Instagram, Pinterest, and
                  <br /> camera roll · 23 items
                </p>
                <button
                  aria-label="Save"
                  className="grid size-8 place-items-center rounded-full bg-secondary text-foreground/70 ring-1 ring-border hover:text-primary"
                >
                  <Bookmark className="size-4" aria-hidden />
                </button>
              </div>
            </Float>

            {/* Itinerary draft card */}
            <Float className="absolute right-12 top-[190px] w-[460px] rounded-[22px] bg-card p-5 shadow-[0_30px_80px_-28px_rgba(29,36,32,0.5)] ring-1 ring-black/5" amplitude={6} duration={8.5}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[15px] font-medium text-foreground">
                    {PLAN_DRAFT.title}
                  </div>
                  <div className="mt-0.5 text-[12.5px] text-muted-foreground">
                    {PLAN_DRAFT.duration}
                  </div>
                </div>
                <span className="inline-flex items-center rounded-full bg-soft-accent/35 px-2.5 py-0.5 text-[11.5px] font-medium text-accent">
                  Draft
                </span>
              </div>

              <ul className="mt-4 divide-y divide-border/60">
                {PLAN_DRAFT.itinerary.map((d) => (
                  <li
                    key={d.day}
                    className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="grid w-8 place-items-center text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                      <span>Day</span>
                      <span className="text-foreground">{d.day}</span>
                    </div>
                    <div className="relative size-9 overflow-hidden rounded-lg ring-1 ring-black/5">
                      <Image
                        src={d.cover || "/placeholder.svg"}
                        alt=""
                        fill
                        sizes="36px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-medium text-foreground">
                        {d.name}
                      </div>
                      <div className="truncate text-[12px] text-muted-foreground">
                        {d.note}
                      </div>
                    </div>
                    <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                <button className="text-[13px] text-muted-foreground hover:text-primary">
                  + Add day
                </button>
                <button className="inline-flex items-center gap-1.5 text-[13px] font-medium text-primary">
                  View full itinerary
                  <ArrowRight className="size-3.5" aria-hidden />
                </button>
              </div>
            </Float>
          </div>
        </Reveal>
      </div>

      {/* Wavy bottom edge — subtle paper transition */}
      <svg
        aria-hidden
        viewBox="0 0 1440 60"
        className="absolute inset-x-0 bottom-0 h-12 w-full text-background"
        preserveAspectRatio="none"
      >
        <path
          d="M0,30 C240,55 480,5 720,30 C960,55 1200,5 1440,30 L1440,60 L0,60 Z"
          fill="currentColor"
        />
      </svg>
    </LandingSection>
  )
}

function FeatureCard({
  icon,
  title,
  note,
}: {
  icon: React.ReactNode
  title: string
  note: string
}) {
  return (
    <StaggerItem className="rounded-2xl bg-card/85 p-4 ring-1 ring-border/60 backdrop-blur-sm transition duration-500 hover:-translate-y-1 hover:bg-card/95">
      <div className="flex items-center gap-2 text-foreground">
        <span className="grid size-7 place-items-center rounded-lg bg-secondary text-primary">
          {icon}
        </span>
        <span className="text-[13.5px] font-medium">{title}</span>
      </div>
      <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
        {note}
      </p>
    </StaggerItem>
  )
}
