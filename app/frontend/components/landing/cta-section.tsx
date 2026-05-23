import Image from "next/image"
import Link from "next/link"
import section7Bg from "@/public/landing/section7-bg.png"
import { Compass, Layers, Lock, ShieldCheck, Sparkles } from "lucide-react"
import { SnapTripLogo } from "@/components/snaptrip-logo"
import { LandingSection, Reveal, Sheen, Stagger, StaggerItem } from "@/components/landing/landing-motion"

export function CtaSection() {
  return (
    <LandingSection className="relative isolate overflow-hidden bg-night text-mist md:flex md:min-h-[100svh] md:items-center">
      <div aria-hidden className="absolute inset-0 h-full w-full">
        <Image
          src={section7Bg}
          alt=""
          fill
          sizes="100vw"
          className="h-full w-full object-cover"
          priority={false}
        />
      </div>
      <Sheen className="opacity-20" />
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_30%,rgba(11,42,37,0.4),rgba(16,24,21,0.85)_70%)]"
      />

      <Reveal className="relative mx-auto flex w-full max-w-[1280px] flex-col items-center px-6 py-24 text-center md:px-10 md:py-10">
        <SnapTripLogo tone="light" />

        <div className="mt-10 font-mono text-[11px] uppercase tracking-[0.28em] text-soft-accent">
          Your journey, perfectly planned
        </div>

        <h2 className="mt-6 font-display text-[clamp(2.6rem,5vw,4.6rem)] leading-[1.02] tracking-[-0.015em] text-mist text-balance">
          Ready to turn inspiration
          <br />
          into a real trip?
        </h2>

        <p className="mt-6 max-w-xl text-[15.5px] leading-relaxed text-sage">
          Create your trip from the places you saved, or keep exploring public
          plans across Indonesia.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signin?next=%2Fnew&action=plan"
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-[15px] font-medium text-primary-foreground transition hover:bg-[#0b2a25]"
          >
            <Sparkles className="size-4" aria-hidden />
            Create your trip
          </Link>
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 rounded-2xl bg-mist px-6 py-3.5 text-[15px] font-medium text-canopy transition hover:bg-[#ebe3d4]"
          >
            <Compass className="size-4" aria-hidden />
            Browse Explore
          </Link>
        </div>

        {/* Three reassurance points */}
        <Stagger className="mt-12 grid w-full max-w-3xl grid-cols-1 gap-6 border-t border-dark-line pt-7 sm:grid-cols-3">
          <Reassure
            icon={<Layers className="size-5" aria-hidden />}
            title="Structured plans"
            note="Clear itineraries you can adjust with ease."
          />
          <Reassure
            icon={<ShieldCheck className="size-5" aria-hidden />}
            title="Recommendations"
            note="Curated spots and tips that match your style."
          />
          <Reassure
            icon={<Lock className="size-5" aria-hidden />}
            title="Private sharing"
            note="Your trips stay private until you share."
          />
        </Stagger>
      </Reveal>

      {/* Wavy bottom edge into footer */}
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

function Reassure({
  icon,
  title,
  note,
}: {
  icon: React.ReactNode
  title: string
  note: string
}) {
  return (
    <StaggerItem className="flex flex-col items-center gap-2 text-center">
      <span className="grid size-10 place-items-center rounded-full text-soft-accent ring-1 ring-dark-line">
        {icon}
      </span>
      <div className="mt-1 text-[14px] font-medium text-mist">{title}</div>
      <div className="max-w-[200px] text-[12.5px] leading-relaxed text-sage">
        {note}
      </div>
    </StaggerItem>
  )
}
