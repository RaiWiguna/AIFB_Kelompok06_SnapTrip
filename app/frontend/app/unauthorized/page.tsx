import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Lock } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { IMG_ALIAS } from "@/lib/data"

export default function UnauthorizedPage() {
  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px]">
        <Image src={IMG_ALIAS.bromoMisty || "/placeholder.svg"} alt="" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/55 via-primary/35 to-background" />
      </div>

      <SiteHeader tone="light" />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-6 pb-24 pt-16 text-center md:pt-24">
        <span className="grid size-14 place-items-center rounded-full bg-card text-primary ring-1 ring-border/70">
          <Lock className="size-6" aria-hidden />
        </span>
        <div className="mt-5 font-mono text-[11px] uppercase tracking-[0.22em] text-soft-accent">
          Private by default
        </div>
        <h1 className="mt-3 font-display text-[clamp(2.2rem,4vw,3.4rem)] leading-[1.05] tracking-[-0.02em] text-primary-foreground text-balance">
          This trip is private.
        </h1>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-primary-foreground/85">
          Only the owner and invited participants can view this plan. If you were sent a link, sign in with the email
          it was addressed to.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signin"
            className="inline-flex items-center gap-2 rounded-full bg-card px-6 py-3 text-[13.5px] font-medium text-primary ring-1 ring-border hover:bg-secondary"
          >
            Sign in
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 rounded-full bg-primary/85 px-6 py-3 text-[13.5px] font-medium text-primary-foreground ring-1 ring-primary-foreground/20 hover:bg-primary"
          >
            Browse public trips
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
