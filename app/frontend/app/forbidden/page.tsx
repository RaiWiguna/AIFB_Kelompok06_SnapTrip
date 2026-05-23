import Image from "next/image"
import Link from "next/link"
import { ArrowRight, ShieldOff } from "lucide-react"
import { AuthenticatedAppHeader } from "@/components/authenticated-app-header"
import { AppFooter } from "@/components/app-footer"
import { IMG_ALIAS } from "@/lib/data"

export default function ForbiddenPage() {
  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px]">
        <Image
          src={IMG_ALIAS.sunsetGate || "/placeholder.svg"}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/55 via-primary/35 to-background" />
      </div>

      <AuthenticatedAppHeader />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-6 pb-24 pt-16 text-center md:pt-24">
        <span className="grid size-14 place-items-center rounded-full bg-card text-primary ring-1 ring-border/70">
          <ShieldOff className="size-6" aria-hidden />
        </span>
        <div className="mt-5 font-mono text-[11px] uppercase tracking-[0.22em] text-soft-accent">
          You don&apos;t have access
        </div>
        <h1 className="mt-3 font-display text-[clamp(2.2rem,4vw,3.4rem)] leading-[1.05] tracking-[-0.02em] text-primary-foreground text-balance">
          This trip isn&apos;t open to you.
        </h1>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-primary-foreground/85">
          You&apos;re signed in, but this plan is private to its owner and invited participants. Ask the trip creator
          to invite you, or keep exploring public plans across Indonesia.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/explore?as=user"
            className="inline-flex items-center gap-2 rounded-full bg-card px-6 py-3 text-[13.5px] font-medium text-primary ring-1 ring-border hover:bg-secondary"
          >
            Browse public trips
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link
            href="/trips"
            className="inline-flex items-center gap-2 rounded-full bg-primary/85 px-6 py-3 text-[13.5px] font-medium text-primary-foreground ring-1 ring-primary-foreground/20 hover:bg-primary"
          >
            Open my trips
          </Link>
        </div>

        <p className="mt-8 text-[12.5px] text-primary-foreground/70">
          Signed in as the wrong account?{" "}
          <Link href="/signin" className="underline underline-offset-4 hover:text-primary-foreground">
            Switch account
          </Link>
        </p>
      </main>

      <AppFooter />
    </div>
  )
}
