import Image from "next/image"
import Link from "next/link"
import { ArrowRight, AtSign, Compass, Lock, Sparkles, User } from "lucide-react"
import { SnapTripLogo } from "@/components/snaptrip-logo"
import { IMG } from "@/lib/data"
import { buildAuthHref, getAuthCopy, isSafeNext, markAuthedNext } from "@/lib/auth-context"

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; action?: string }>
}) {
  const { next: nextParam, action } = await searchParams
  const next = isSafeNext(nextParam) ? nextParam : "/explore"
  const successHref = markAuthedNext(next)
  const copy = getAuthCopy(action)
  const hasContext = Boolean(action)
  const signinHref = buildAuthHref("signin", next, action as Parameters<typeof buildAuthHref>[2])

  return (
    <main className="grid min-h-svh bg-background text-foreground lg:grid-cols-2">
      <section className="relative hidden min-h-svh overflow-hidden lg:block">
        <Image
          src={IMG.baliCoastalPano || "/placeholder.svg"}
          alt=""
          fill
          sizes="50vw"
          className="object-cover"
          priority
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-black/10" />
        <div className="absolute inset-x-0 bottom-0 p-12 text-mist">
          <div className="max-w-[540px]">
            <p className="font-display text-[48px] leading-[0.98] tracking-tight">
              Start with the places that caught your eye.
            </p>
            <p className="mt-4 max-w-[440px] text-[15px] leading-relaxed text-mist/82">
              Save discoveries, shape the route, and invite people when the plan is ready.
            </p>
          </div>
        </div>
      </section>

      <section className="flex min-h-svh items-center px-6 py-6 md:px-10 lg:px-16 xl:px-20">
        <div className="mx-auto flex w-full max-w-[520px] flex-col">
          <div className="mb-9 flex items-center justify-between gap-5">
            <SnapTripLogo />
            <Link
              href="/"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-card text-primary ring-1 ring-border transition hover:-translate-y-0.5 hover:bg-secondary"
              aria-label="Back to homepage"
            >
              <Compass className="size-4" aria-hidden />
            </Link>
          </div>

          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">
            {hasContext ? "Continue your action" : "Create an account"}
          </div>
          <h1 className="mt-4 max-w-[500px] font-display text-[44px] leading-[0.98] tracking-tight text-primary text-balance md:text-[54px]">
            {hasContext ? copy.title : "Plan trips you can actually share."}
          </h1>
          <p className="mt-5 max-w-[450px] text-[15px] leading-relaxed text-foreground/70">
            {hasContext ? copy.body : "Accounts are needed to save collections, create plans, and invite participants."}
          </p>

          {hasContext && (
            <div className="mt-6 flex items-start gap-3 rounded-[22px] bg-secondary/80 p-4 ring-1 ring-border">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-card text-primary ring-1 ring-border">
                <Sparkles className="size-4" aria-hidden />
              </span>
              <p className="text-[13px] leading-relaxed text-foreground/75">
                We&apos;ll bring you back to where you left off as soon as your account is ready.
              </p>
            </div>
          )}

          <form className="mt-7 space-y-3.5">
            <label className="block">
              <span className="text-[12.5px] font-medium text-foreground/75">Display name</span>
              <div className="mt-2 flex items-center gap-3 rounded-[18px] bg-card px-4 py-3 ring-1 ring-border transition focus-within:ring-primary">
                <User className="size-4 text-muted-foreground" aria-hidden />
                <input
                  type="text"
                  placeholder="Lintang Pertiwi"
                  className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-[12.5px] font-medium text-foreground/75">Email</span>
              <div className="mt-2 flex items-center gap-3 rounded-[18px] bg-card px-4 py-3 ring-1 ring-border transition focus-within:ring-primary">
                <AtSign className="size-4 text-muted-foreground" aria-hidden />
                <input
                  type="email"
                  placeholder="you@example.com"
                  className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-[12.5px] font-medium text-foreground/75">Password</span>
              <div className="mt-2 flex items-center gap-3 rounded-[18px] bg-card px-4 py-3 ring-1 ring-border transition focus-within:ring-primary">
                <Lock className="size-4 text-muted-foreground" aria-hidden />
                <input
                  type="password"
                  placeholder="At least 8 characters"
                  className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground"
                />
              </div>
            </label>

            <p className="pt-1 text-[12px] leading-relaxed text-muted-foreground">
              By creating an account you agree to keep planning honest. SnapTrip never sells your trip data.
            </p>

            <Link
              href={successHref}
              className="inline-flex w-full items-center justify-center gap-2 rounded-[18px] bg-primary px-5 py-3.5 text-[14px] font-medium text-primary-foreground shadow-[0_18px_42px_rgba(18,60,53,0.22)] transition hover:-translate-y-0.5 hover:bg-[#0b2a25]"
            >
              {hasContext ? "Create account and continue" : "Create account"}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </form>

          <p className="mt-6 text-[13.5px] text-muted-foreground">
            Already have an account?{" "}
            <Link href={signinHref} className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </main>
  )
}
