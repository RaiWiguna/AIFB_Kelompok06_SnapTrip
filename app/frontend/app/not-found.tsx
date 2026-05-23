import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Compass } from "lucide-react"
import { SnapTripLogo } from "@/components/snaptrip-logo"
import { IMG } from "@/lib/data"

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <Image src={IMG.indonesiaMap || "/placeholder.svg"} alt="" fill sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/85 to-background" />
      </div>

      <header className="mx-auto w-full max-w-7xl px-6 py-6 md:px-10">
        <Link href="/" aria-label="SnapTrip home">
          <SnapTripLogo />
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-6 py-16 text-center">
        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">404 · Off the map</div>
        <h1 className="mt-6 font-display text-[clamp(2.6rem,5vw,4rem)] leading-[1.02] tracking-[-0.02em] text-primary text-balance">
          We can&apos;t find that page.
        </h1>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-foreground/75">
          The link may be broken, the trip may have been unpublished, or it might just be wandering somewhere in the
          Java Sea. Let&apos;s get you back on the trail.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-[13.5px] font-medium text-primary-foreground hover:bg-[#0b2a25]"
          >
            Back to home
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 rounded-full bg-card px-6 py-3 text-[13.5px] font-medium ring-1 ring-border hover:bg-secondary"
          >
            <Compass className="size-4" aria-hidden />
            Browse Explore
          </Link>
        </div>
      </main>
    </div>
  )
}
