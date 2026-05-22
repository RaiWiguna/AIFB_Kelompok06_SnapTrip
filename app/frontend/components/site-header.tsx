import Link from "next/link"
import { ChevronDown, Globe } from "lucide-react"
import { SnapTripLogo } from "./snaptrip-logo"
import { cn } from "@/lib/utils"

type Tone = "default" | "light"

/**
 * Public, marketing-only header.
 *
 * Nav is intentionally limited to Explore + About per the access model:
 * Collections, My Trips, New Trip and the planning workspace are gated
 * behind auth and live under the AppHeader.
 */
export function SiteHeader({
  active,
  tone = "default",
}: {
  active?: "explore" | "about"
  tone?: Tone
}) {
  const isLight = tone === "light"
  const linkBase = isLight ? "text-mist/85 hover:text-mist" : "text-foreground/75 hover:text-foreground"
  const signinColor = isLight ? "text-mist" : "text-foreground"
  const ctaBase = isLight
    ? "bg-mist text-primary hover:bg-mist/90"
    : "bg-primary text-primary-foreground hover:bg-[#0b2a25]"
  const eyebrowColor = isLight ? "text-mist/70" : "text-accent"
  const ruleColor = isLight ? "bg-mist/15" : "bg-border/70"

  return (
    <header className="relative z-30 w-full">
      <div className="mx-auto w-full max-w-[1480px] px-6 md:px-10">
        {/* Editorial eyebrow rule */}
        <div className="flex items-center gap-3 pt-5">
          <span className={cn("h-px flex-1", ruleColor)} aria-hidden />
          <span className={cn("font-mono text-[10.5px] uppercase tracking-[0.32em]", eyebrowColor)}>
            SnapTrip · Indonesia
          </span>
          <span className={cn("h-px flex-1", ruleColor)} aria-hidden />
        </div>

        <div className="flex h-20 items-center justify-between">
          <Link href="/" aria-label="SnapTrip home" className="flex items-center">
            <SnapTripLogo tone={isLight ? "light" : "dark"} />
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-12 md:flex">
            <NavLink href="/explore" active={active === "explore"} tone={tone}>
              Explore
            </NavLink>
            <NavLink href="/about" active={active === "about"} tone={tone}>
              About
            </NavLink>
          </nav>

          <div className="flex items-center gap-5">
            <button
              type="button"
              aria-label="Language"
              className={cn("hidden items-center gap-2 text-[14px] md:flex", linkBase)}
            >
              <Globe className="size-4" aria-hidden />
              <span>ID</span>
              <ChevronDown className="size-4" aria-hidden />
            </button>
            <Link
              href="/signin"
              className={cn("text-[14.5px] font-medium transition-colors hover:opacity-80", signinColor)}
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className={cn(
                "inline-flex items-center rounded-full px-4 py-2 text-[13.5px] font-medium transition-colors",
                ctaBase,
              )}
            >
              Get started
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}

function NavLink({
  href,
  active,
  tone,
  children,
}: {
  href: string
  active?: boolean
  tone: Tone
  children: React.ReactNode
}) {
  const isLight = tone === "light"
  return (
    <Link
      href={href}
      className={cn(
        "relative text-[15px] font-medium transition-colors",
        active
          ? isLight
            ? "text-mist"
            : "text-primary"
          : isLight
            ? "text-mist/85 hover:text-mist"
            : "text-foreground/80 hover:text-primary",
      )}
    >
      {children}
      {active ? (
        <span
          aria-hidden
          className={cn("absolute -bottom-2 left-0 right-0 h-px", isLight ? "bg-mist" : "bg-primary")}
        />
      ) : null}
    </Link>
  )
}
