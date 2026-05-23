import Image from "next/image"
import Link from "next/link"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { ArrowRight, Bookmark, Layers, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react"
import { AppHeader } from "@/components/app-header"
import { AppFooter } from "@/components/app-footer"
import { CategoryIcon } from "@/components/category-icon"
import { ApiError } from "@/lib/api/client"
import { getCollections } from "@/lib/api/collections"
import { getExploreTrips } from "@/lib/api/explore"
import { CATEGORIES, type CategoryId } from "@/lib/categories"
import { IMG } from "@/lib/data"

const COVER: Record<CategoryId, string> = {
  pantai: IMG.diamondBeach,
  gunung: IMG.bromoTengger,
  air_terjun: IMG.baliCoastalPano,
  wisata_tradisional: IMG.baliWomanTemple,
}

export default async function CollectionsPage() {
  const cookieHeader = (await cookies()).toString()
  let collections
  let publicTrips
  try {
    collections = await getCollections(cookieHeader)
    publicTrips = await getExploreTrips({ cookieHeader, limit: 50 })
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect("/signin?next=%2Fcollections&action=collections")
    }
    throw error
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader active="collections" />
      <main className="mx-auto w-full max-w-[1480px] flex-1 px-6 pb-24 pt-6 md:px-10">
        <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Collections</div>
            <h1 className="mt-4 font-display text-[clamp(2.4rem,4vw,3.6rem)] leading-[1.04] tracking-[-0.02em] text-primary text-balance">
              Travel collections, organized by feeling.
            </h1>
            <p className="mt-5 text-[15px] leading-relaxed text-foreground/75">
              Browse hand-picked sets of trips grouped by category. Save what catches your eye and turn collections into
              full plans whenever you&apos;re ready.
            </p>
          </div>
          <Link
            href="/collections?new=1"
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-primary px-5 py-3 text-[14px] font-medium text-primary-foreground hover:bg-[#0b2a25] md:self-end"
          >
            <Plus className="size-4" aria-hidden />
            New collection
          </Link>
        </div>

        {/* Your collections */}
        <section className="mb-16">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Your collections</div>
              <h2 className="mt-2 font-display text-[28px] leading-tight tracking-tight text-primary">
                Personal boards
              </h2>
            </div>
            <span className="text-[12.5px] text-muted-foreground">{collections.length} collections</span>
          </div>

          {collections.length === 0 ? (
            <div className="rounded-3xl bg-secondary/40 p-10 text-center ring-1 ring-border">
              <p className="font-display text-[22px] tracking-tight text-primary">
                No collections yet.
              </p>
              <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-muted-foreground">
                Save trips from Explore to build your first board, or open Explore to browse public plans.
              </p>
              <div className="mt-5 flex items-center justify-center gap-2">
                <Link
                  href="/explore"
                  className="inline-flex items-center gap-2 rounded-full bg-card px-5 py-2.5 text-[13px] font-medium text-foreground ring-1 ring-border hover:bg-secondary"
                >
                  Open Explore
                </Link>
                <Link
                  href="/collections?new=1"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-[13px] font-medium text-primary-foreground hover:bg-[#0b2a25]"
                >
                  <Plus className="size-4" aria-hidden />
                  New collection
                </Link>
              </div>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {collections.map((c) => (
                <li
                  key={c.slug}
                  className="group relative overflow-hidden rounded-3xl bg-card ring-1 ring-border transition hover:ring-primary/40"
                >
                  <Link href={`/collections/${c.slug}`} className="block">
                    <div className="grid grid-cols-2 gap-1 p-2">
                      {c.covers.slice(0, 4).map((src, i) => (
                        <div key={i} className="relative aspect-[5/4] overflow-hidden rounded-xl ring-1 ring-black/5">
                          <Image src={src || "/placeholder.svg"} alt="" fill sizes="200px" className="object-cover" unoptimized />
                        </div>
                      ))}
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-display text-[20px] leading-tight tracking-tight text-primary">{c.name}</h3>
                        <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
                          <Bookmark className="size-3.5" aria-hidden />
                          {c.count}
                        </span>
                      </div>
                      <p className="mt-1 text-[12.5px] text-muted-foreground">{c.description}</p>
                    </div>
                  </Link>

                  {/* Owner-only quick actions: rename / delete (per §16.9) */}
                  <div className="absolute right-3 top-3 flex items-center gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                    <button
                      type="button"
                      aria-label={`Rename ${c.name}`}
                      className="grid size-7 place-items-center rounded-full bg-card/95 text-foreground ring-1 ring-border hover:text-primary"
                    >
                      <Pencil className="size-3.5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${c.name}`}
                      className="grid size-7 place-items-center rounded-full bg-card/95 text-foreground ring-1 ring-border hover:text-[color:var(--color-error)]"
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      aria-label={`More actions for ${c.name}`}
                      className="grid size-7 place-items-center rounded-full bg-card/95 text-foreground ring-1 ring-border hover:text-primary"
                    >
                      <MoreHorizontal className="size-3.5" aria-hidden />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="mb-5 flex items-end justify-between">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Browse by category</div>
            <h2 className="mt-2 font-display text-[28px] leading-tight tracking-tight text-primary">
              Explore by feeling
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((c) => {
            const count = publicTrips.filter((t) => t.categories.includes(c.id)).length
            return (
              <Link
                key={c.id}
                href={`/explore?category=${c.id}`}
                className="group relative block overflow-hidden rounded-3xl ring-1 ring-black/5"
              >
                <div className="relative aspect-[4/5] w-full">
                  <Image
                    src={COVER[c.id] || "/placeholder.svg"}
                    alt={c.label}
                    fill
                    sizes="(max-width: 768px) 100vw, 25vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                  <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                </div>
                <div className="absolute inset-x-0 bottom-0 p-5 text-mist">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11.5px] font-medium text-foreground">
                    <CategoryIcon id={c.id} className="text-primary" />
                    {c.label}
                  </span>
                  <h3 className="mt-3 font-display text-[26px] leading-tight text-mist">
                    {c.label} collection
                  </h3>
                  <p className="mt-1 text-[12.5px] text-mist/75">{c.description}</p>
                  <div className="mt-4 flex items-center justify-between text-[12.5px] text-mist/85">
                    <span className="inline-flex items-center gap-1.5">
                      <Bookmark className="size-3.5" aria-hidden />
                      {count} trips
                    </span>
                    <span className="inline-flex items-center gap-1 font-medium">
                      Browse <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Editor's collections */}
        <div className="mt-16">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Editor&apos;s sets</div>
              <h2 className="mt-2 font-display text-[34px] leading-tight tracking-tight text-primary">
                Curated by SnapTrip
              </h2>
            </div>
            <Link href="/explore" className="inline-flex items-center gap-1 text-[13.5px] font-medium text-primary">
              View all <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {[
              { name: "First-time in Bali", count: 8, cover: IMG.baliCoastalPano },
              { name: "Volcano sunrises", count: 5, cover: IMG.bromoTengger },
              { name: "Sacred temples & ceremonies", count: 6, cover: IMG.baliWomanTemple },
            ].map((s) => (
              <article key={s.name} className="overflow-hidden rounded-3xl bg-card ring-1 ring-border/70">
                <div className="relative aspect-[16/10]">
                  <Image src={s.cover || "/placeholder.svg"} alt="" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
                </div>
                <div className="p-5">
                  <div className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
                    <Layers className="size-3.5" aria-hidden />
                    {s.count} trips
                  </div>
                  <h3 className="mt-2 font-display text-[22px] leading-tight text-foreground">{s.name}</h3>
                </div>
              </article>
            ))}
          </div>
        </div>
      </main>
      <AppFooter />
    </div>
  )
}
