import Image from "next/image"
import Link from "next/link"
import { Compass, Sparkles } from "lucide-react"
import { SignInForm } from "@/components/auth/signin-form"
import { SnapTripLogo } from "@/components/snaptrip-logo"
import { IMG } from "@/lib/data"
import { buildAuthHref, getAuthCopy, isSafeNext, markAuthedNext } from "@/lib/auth-context"

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; action?: string }>
}) {
  const { next: nextParam, action } = await searchParams
  const next = isSafeNext(nextParam) ? nextParam : "/explore"
  const successHref = markAuthedNext(next)
  const copy = getAuthCopy(action)
  const hasContext = Boolean(action)
  const signupHref = buildAuthHref("signup", next, action as Parameters<typeof buildAuthHref>[2])

  return (
    <main className="grid min-h-svh bg-background text-foreground lg:grid-cols-2">
      <section className="flex min-h-svh items-center px-6 py-8 md:px-10 lg:px-16 xl:px-20">
        <div className="mx-auto flex w-full max-w-[520px] flex-col">
          <div className="mb-14 flex items-center justify-between gap-5">
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
            {hasContext ? "Continue your action" : "Welcome back"}
          </div>
          <h1 className="mt-4 max-w-[500px] font-display text-[46px] leading-[0.98] tracking-tight text-primary text-balance md:text-[58px]">
            {hasContext ? copy.title : "Sign in to your SnapTrip plans."}
          </h1>
          <p className="mt-5 max-w-[440px] text-[15px] leading-relaxed text-foreground/70">
            {copy.body}
          </p>

          {hasContext && (
            <div className="mt-6 flex items-start gap-3 rounded-[22px] bg-secondary/80 p-4 ring-1 ring-border">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-card text-primary ring-1 ring-border">
                <Sparkles className="size-4" aria-hidden />
              </span>
              <p className="text-[13px] leading-relaxed text-foreground/75">
                We&apos;ll bring you back to where you left off after you sign in.
              </p>
            </div>
          )}

          <SignInForm successHref={successHref} buttonLabel={hasContext ? "Sign in and continue" : "Sign in"} />

          <p className="mt-6 text-[13.5px] text-muted-foreground">
            New to SnapTrip?{" "}
            <Link href={signupHref} className="font-medium text-primary hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </section>

      <section className="relative hidden min-h-svh overflow-hidden lg:block">
        <Image
          src={IMG.baliGateSunset || "/placeholder.svg"}
          alt=""
          fill
          sizes="50vw"
          className="object-cover"
          priority
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-black/10" />
        <div className="absolute inset-x-0 bottom-0 p-12 text-mist">
          <div className="max-w-[520px]">
            <p className="font-display text-[48px] leading-[0.98] tracking-tight">
              Wonder, gently planned.
            </p>
            <p className="mt-4 max-w-[430px] text-[15px] leading-relaxed text-mist/82">
              Pick up the trips that caught your eye, then keep planning without losing your place.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
