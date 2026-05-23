import Link from "next/link"
import { Bell, Bookmark, Compass, Layers, Plus, Search, Sparkles } from "lucide-react"
import { SnapTripMark } from "./snaptrip-logo"
import { cn } from "@/lib/utils"

export type AppHeaderActive = "explore" | "new" | "collections" | "trips" | "plan" | "account"

/**
 * Authenticated workspace header.
 *
 * Visually distinct from the public SiteHeader: sticky pill nav with
 * icon + label, an in-line search affordance, saved-trips bookmark,
 * notifications, and an avatar that opens the account menu. This header
 * is only rendered on routes that require sign-in.
 */
export function AppHeader({
  active,
  user = { name: "Lintang Pertiwi", email: "lintang@snaptrip.id", initials: "LP" },
}: {
  active?: AppHeaderActive
  user?: { name: string; email: string; initials: string }
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 w-full max-w-[1480px] items-center gap-4 px-4 md:px-8">
        {/* Brand mark only — keeps the workspace tighter than the marketing site */}
        <Link href="/explore?as=user" aria-label="SnapTrip workspace" className="flex items-center gap-2">
          <SnapTripMark className="size-7" />
          <span className="font-display text-[20px] tracking-tight text-primary">SnapTrip</span>
        </Link>

        <span aria-hidden className="hidden h-6 w-px bg-border md:block" />

        {/* Pill nav */}
        <nav aria-label="Workspace" className="hidden items-center gap-1 md:flex">
          <PillLink href="/explore?as=user" icon={Compass} label="Explore" active={active === "explore"} />
          <PillLink href="/new" icon={Plus} label="New trip" active={active === "new"} accent />
          <PillLink href="/collections" icon={Layers} label="Collections" active={active === "collections"} />
          <PillLink href="/trips" icon={Sparkles} label="My trips" active={active === "trips"} />
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {/* Inline search */}
          <label className="hidden h-9 items-center gap-2 rounded-full bg-secondary px-3 text-[13px] text-muted-foreground ring-1 ring-border lg:flex">
            <Search className="size-3.5" aria-hidden />
            <input
              type="search"
              placeholder="Search trips, places, collections"
              className="w-56 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <kbd className="ml-auto rounded bg-card px-1.5 py-0.5 font-mono text-[10.5px] text-muted-foreground ring-1 ring-border">
              ⌘K
            </kbd>
          </label>

          <IconButton href="/likes" label="Saved trips">
            <Bookmark className="size-4" aria-hidden />
          </IconButton>
          <IconButton href="/account?tab=notifications" label="Notifications">
            <Bell className="size-4" aria-hidden />
            <span
              aria-hidden
              className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-accent ring-2 ring-background"
            />
          </IconButton>

          {/* Avatar */}
          <Link
            href="/account"
            aria-label="Account"
            className={cn(
              "ml-1 flex h-9 items-center gap-2 rounded-full bg-card pl-1 pr-3 ring-1 transition",
              active === "account" ? "ring-primary" : "ring-border hover:ring-primary/40",
            )}
          >
            <span className="grid size-7 place-items-center rounded-full bg-primary font-mono text-[11.5px] font-medium text-primary-foreground">
              {user.initials}
            </span>
            <span className="hidden text-[13px] font-medium text-foreground md:inline">
              {user.name.split(" ")[0]}
            </span>
          </Link>
        </div>
      </div>
    </header>
  )
}

function PillLink({
  href,
  icon: Icon,
  label,
  active,
  accent,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  active?: boolean
  accent?: boolean
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[13.5px] font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : accent
            ? "text-primary hover:bg-secondary"
            : "text-foreground/75 hover:bg-secondary hover:text-foreground",
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {label}
    </Link>
  )
}

function IconButton({
  href,
  label,
  children,
}: {
  href: string
  label: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="relative inline-flex size-9 items-center justify-center rounded-full bg-card text-foreground/80 ring-1 ring-border transition hover:text-primary hover:ring-primary/40"
    >
      {children}
    </Link>
  )
}
