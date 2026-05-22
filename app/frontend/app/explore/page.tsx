import Image from "next/image"
import Link from "next/link"
import { Bell, Bookmark, ChevronDown, ChevronUp, Compass, Lock, Plus, SlidersHorizontal, Sparkles, Star, X } from "lucide-react"
import { AppHeader } from "@/components/app-header"
import { AppFooter } from "@/components/app-footer"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { TripCard } from "@/components/trip-card"
import { CategoryIcon } from "@/components/category-icon"
import { CATEGORIES, IMG, TRIPS } from "@/lib/data"

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ as?: string }>
}) {
  const { as } = await searchParams
  const isAuthed = as === "user"
  const filtered = TRIPS.filter((t) => t.categories.includes("pantai"))

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      {/* Soft palms background bottom-left, like the reference */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[520px]">
        <Image
          src={IMG.heroLandscape || "/placeholder.svg"}
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-[20%_85%] opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background" />
      </div>

      {isAuthed ? <AppHeader active="explore" /> : <SiteHeader active="explore" />}

      <main className="mx-auto w-full max-w-[1480px] flex-1 px-6 pb-24 pt-4 md:px-10">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[300px_1fr]">
          {/* Sidebar */}
          <aside className="space-y-8">
            <nav aria-label="Breadcrumb" className="font-mono text-[12.5px] uppercase tracking-[0.18em] text-muted-foreground">
              <span>Explore</span>
              <span className="mx-2 text-border">/</span>
              <span className="text-accent">Pantai</span>
            </nav>

            <div>
              <h1 className="font-display text-[44px] leading-[1.05] tracking-[-0.02em] text-primary text-balance">
                Coastal trips worth saving
              </h1>
              <p className="mt-4 max-w-sm text-[14.5px] leading-relaxed text-foreground/70">
                From turquoise beaches to dramatic cliffs, find beach escapes and coastal journeys curated by fellow
                travelers.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full bg-card px-3.5 py-2 text-[13px] ring-1 ring-border">
              <Compass className="size-4 text-accent" aria-hidden />
              <span className="font-medium">28 trips found</span>
              <span className="text-muted-foreground">in</span>
              <span className="font-medium text-accent">Pantai</span>
            </div>

            <div className="rounded-2xl bg-card p-5 ring-1 ring-border">
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-medium">Refine your search</span>
                <SlidersHorizontal className="size-4 text-muted-foreground" aria-hidden />
              </div>

              <div className="mt-5">
                <button className="flex w-full items-center justify-between text-[13px] font-medium text-foreground">
                  Duration
                  <ChevronUp className="size-4 text-muted-foreground" aria-hidden />
                </button>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Chip selected>All</Chip>
                  <Chip>1–2 days</Chip>
                  <Chip>3–4 days</Chip>
                  <Chip>5+ days</Chip>
                </div>
              </div>

              <div className="mt-5 border-t border-border/70 pt-5">
                <button className="flex w-full items-center justify-between text-[13px] font-medium text-foreground">
                  Budget per person
                  <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
                </button>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Chip selected>All</Chip>
                  <Chip>Under Rp 1M</Chip>
                  <Chip>Rp 1–2M</Chip>
                  <Chip>Rp 2M+</Chip>
                </div>
              </div>
            </div>

            {isAuthed ? (
              <div className="rounded-2xl bg-card p-5 ring-1 ring-border">
                <div className="flex items-start gap-3">
                  <span className="grid size-9 place-items-center rounded-xl bg-secondary text-primary">
                    <Sparkles className="size-4" aria-hidden />
                  </span>
                  <div>
                    <p className="text-[14px] font-medium">Turn finds into a plan</p>
                    <p className="mt-1 text-[12.5px] text-muted-foreground">
                      Save trips you like, then seed a new itinerary from your collection in one tap.
                    </p>
                    <Link
                      href="/new"
                      className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground hover:bg-[#0b2a25]"
                    >
                      <Plus className="size-3.5" aria-hidden />
                      Start a trip
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-card p-5 ring-1 ring-border">
                <div className="flex items-start gap-3">
                  <span className="grid size-9 place-items-center rounded-xl bg-secondary text-primary">
                    <Lock className="size-4" aria-hidden />
                  </span>
                  <div>
                    <p className="text-[14px] font-medium">Sign in to save trips</p>
                    <p className="mt-1 text-[12.5px] text-muted-foreground">
                      Save your favorite trips and access them anywhere.
                    </p>
                    <Link
                      href="/signin?next=%2Fexplore%3Fas%3Duser&action=save"
                      className="mt-3 inline-flex items-center rounded-xl bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground hover:bg-[#0b2a25]"
                    >
                      Sign in
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </aside>

          {/* Right column */}
          <section>
            {/* Filter row */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary px-3.5 py-2 text-[13px] font-medium text-primary-foreground">
                <Star className="size-3.5 fill-current text-soft-accent" aria-hidden />
                Filtered by: Pantai
                <button aria-label="Clear filter" className="ml-1 grid size-5 place-items-center rounded-full bg-white/10 hover:bg-white/20">
                  <X className="size-3" aria-hidden />
                </button>
              </span>

              <div className="flex flex-wrap items-center gap-2">
                <CategoryChip id="pantai" selected />
                <CategoryChip id="gunung" />
                <CategoryChip id="air_terjun" />
                <CategoryChip id="wisata_tradisional" />
              </div>

              <div className="ml-auto flex items-center gap-3">
                <div className="hidden items-center gap-2 rounded-full bg-card px-3.5 py-2 text-[13px] ring-1 ring-border md:inline-flex">
                  <span className="text-muted-foreground">Sort by:</span>
                  <span className="font-medium">Popular</span>
                  <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
                </div>
                <div className="inline-flex rounded-full bg-card p-1 ring-1 ring-border">
                  <button className="rounded-full bg-secondary px-3.5 py-1.5 text-[13px] font-medium text-foreground">
                    Popular
                  </button>
                  <button className="px-3.5 py-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground">
                    Recent
                  </button>
                </div>
              </div>
            </div>

            {/* Bento grid: featured big + smaller around */}
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <TripCard trip={filtered[0]} variant="dark" size="lg" className="sm:col-span-2 lg:col-span-1" />
              <TripCard trip={filtered[1]} variant="dark" />
              <TripCard trip={filtered[2]} variant="dark" />
              <TripCard trip={filtered[3]} variant="dark" />
              <TripCard trip={filtered[4]} variant="dark" />
              <TripCard trip={filtered[5]} variant="dark" />
              <TripCard trip={filtered[6]} variant="dark" />
            </div>

            {/* Footer hint */}
            <div className="mt-8 flex items-center gap-3 rounded-2xl bg-card/80 p-4 ring-1 ring-border">
              <span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary">
                <Bookmark className="size-4" aria-hidden />
              </span>
              <div className="flex-1">
                <p className="text-[14px] font-medium">
                  You&apos;re browsing trips in <span className="text-accent">Pantai</span>
                </p>
                <p className="text-[12.5px] text-muted-foreground">
                  Showing only coastal trips and beach destinations.
                </p>
              </div>
              <button className="text-[13.5px] font-medium text-accent hover:underline">Clear filter</button>
            </div>
          </section>
        </div>
      </main>

      {isAuthed ? <AppFooter /> : <SiteFooter />}
    </div>
  )
}

function Chip({
  children,
  selected,
}: {
  children: React.ReactNode
  selected?: boolean
}) {
  return (
    <button
      type="button"
      className={
        selected
          ? "rounded-full bg-primary px-3 py-1.5 text-[12.5px] font-medium text-primary-foreground"
          : "rounded-full bg-secondary px-3 py-1.5 text-[12.5px] text-foreground/80 ring-1 ring-border hover:bg-card"
      }
    >
      {children}
    </button>
  )
}

function CategoryChip({
  id,
  selected,
}: {
  id: (typeof CATEGORIES)[number]["id"]
  selected?: boolean
}) {
  const cat = CATEGORIES.find((c) => c.id === id)!
  return (
    <button
      type="button"
      className={
        selected
          ? "inline-flex items-center gap-2 rounded-full bg-primary px-3.5 py-2 text-[13px] font-medium text-primary-foreground"
          : "inline-flex items-center gap-2 rounded-full bg-card px-3.5 py-2 text-[13px] font-medium text-foreground ring-1 ring-border hover:bg-secondary"
      }
    >
      <CategoryIcon
        id={id}
        className={selected ? "text-primary-foreground" : "text-primary"}
      />
      {cat.label}
    </button>
  )
}
