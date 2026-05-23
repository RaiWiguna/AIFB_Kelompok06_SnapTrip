"use client"

import Image from "next/image"
import Link from "next/link"
import { AlertTriangle, ArrowRight, RotateCcw } from "lucide-react"
import { SnapTripLogo } from "@/components/snaptrip-logo"
import { IMG_ALIAS } from "@/lib/data"

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-70">
        <Image src={IMG_ALIAS.bromoMisty || "/placeholder.svg"} alt="" fill sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/55 via-background/85 to-background" />
      </div>

      <header className="mx-auto w-full max-w-7xl px-6 py-6 md:px-10">
        <Link href="/" aria-label="SnapTrip home">
          <SnapTripLogo />
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-6 py-16 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-destructive/10 text-destructive ring-1 ring-destructive/20">
          <AlertTriangle className="size-6" aria-hidden />
        </span>
        <div className="mt-5 font-mono text-[11px] uppercase tracking-[0.22em] text-accent">
          Something interrupted your trip
        </div>
        <h1 className="mt-3 font-display text-[clamp(2.2rem,4vw,3.4rem)] leading-[1.05] tracking-[-0.02em] text-primary text-balance">
          The view didn&apos;t load this time.
        </h1>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-foreground/75">
          We hit a hiccup loading this page. You can try again, or head back to start fresh. None of your saved trips
          were affected.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-[13.5px] font-medium text-primary-foreground hover:bg-[#0b2a25]"
          >
            <RotateCcw className="size-4" aria-hidden />
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-card px-6 py-3 text-[13.5px] font-medium ring-1 ring-border hover:bg-secondary"
          >
            Back to home
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </main>
    </div>
  )
}
