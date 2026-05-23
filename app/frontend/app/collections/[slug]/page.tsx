import Image from "next/image"
import Link from "next/link"
import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { ArrowRight, Bookmark, CheckCircle2, Compass, MapPin, Share2, Sparkles, X } from "lucide-react"
import { AuthenticatedAppHeader } from "@/components/authenticated-app-header"
import { AppFooter } from "@/components/app-footer"
import { SourceImagesContinueButton } from "@/components/source-images-continue-button"
import { TripCard } from "@/components/trip-card"
import { CategoryIcon } from "@/components/category-icon"
import { ApiError } from "@/lib/api/client"
import { getCollectionDetail } from "@/lib/api/collections"
import { CATEGORY_LABEL } from "@/lib/categories"

export default async function CollectionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ select?: string }>
}) {
  const { slug } = await params
  const { select } = await searchParams
  const isSelecting = select === "1"
  const cookieHeader = (await cookies()).toString()
  let collection
  try {
    collection = await getCollectionDetail(slug, cookieHeader)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound()
    if (error instanceof ApiError && error.status === 401) {
      redirect(`/signin?next=${encodeURIComponent(`/collections/${slug}`)}&action=collections`)
    }
    throw error
  }

  const trips = collection.trips
  // Per §16.10: in selection mode the user picks images to seed New Trip.
  // We pre-mark a representative selection for demo purposes.
  const usableImageIds = trips.map((trip) => trip.sourceImageId).filter((id): id is string => Boolean(id)).slice(0, 8)

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AuthenticatedAppHeader active="collections" next={`/collections/${slug}`} action="collections" />

      <main className="flex-1">
        <section className="relative">
          <div className="relative h-[420px] w-full overflow-hidden md:h-[520px]">
            <Image
              src={collection.cover || "/placeholder.svg"}
              alt={collection.title}
              fill
              priority
              sizes="100vw"
              className="object-cover"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-b from-primary/45 via-primary/25 to-background" />
          </div>

          <div className="mx-auto -mt-40 w-full max-w-6xl px-6 md:-mt-48 md:px-10">
            <nav aria-label="Breadcrumb" className="mb-4 text-[12.5px] text-primary-foreground/85">
              <Link href="/collections" className="hover:text-primary-foreground">
                Collections
              </Link>
              <span className="mx-2">/</span>
              <span className="text-primary-foreground">{collection.title}</span>
            </nav>

            <div className="rounded-3xl bg-card p-7 ring-1 ring-border/70 shadow-[0_40px_120px_-40px_rgba(29,36,32,0.5)] md:p-9">
              <div className="flex flex-wrap items-start justify-between gap-6">
                <div className="max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    {collection.categoryIds.map((c) => (
                      <span
                        key={c}
                        className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-[12px] font-medium ring-1 ring-border"
                      >
                        <CategoryIcon id={c} className="size-3.5" />
                        {CATEGORY_LABEL[c]}
                      </span>
                    ))}
                  </div>
                  <h1 className="mt-4 font-display text-[clamp(2.4rem,5vw,3.6rem)] leading-[1.02] tracking-[-0.02em] text-primary text-balance">
                    {collection.title}
                  </h1>
                  <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-foreground/75">
                    {collection.description}
                  </p>

                  <dl className="mt-6 flex flex-wrap items-center gap-x-7 gap-y-2 text-[13px] text-muted-foreground">
                    <div className="inline-flex items-center gap-1.5">
                      <Compass className="size-3.5 text-primary" aria-hidden />
                      <span>{trips.length} trips</span>
                    </div>
                    <div className="inline-flex items-center gap-1.5">
                      <MapPin className="size-3.5 text-primary" aria-hidden />
                      <span>{collection.region}</span>
                    </div>
                    <div className="inline-flex items-center gap-1.5">
                      <Bookmark className="size-3.5 text-primary" aria-hidden />
                      <span>{collection.savesLabel} saves</span>
                    </div>
                  </dl>
                </div>

                <div className="flex items-center gap-2">
                  <button className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-[13px] font-medium ring-1 ring-border hover:bg-secondary/70">
                    <Share2 className="size-4" aria-hidden />
                    Share
                  </button>
                  {isSelecting ? (
                    <Link
                      href={`/collections/${collection.slug}`}
                      className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 text-[13px] font-medium text-foreground ring-1 ring-border hover:bg-secondary"
                    >
                      <X className="size-4" aria-hidden />
                      Exit selection
                    </Link>
                  ) : (
                    <Link
                      href={`/collections/${collection.slug}?select=1`}
                      className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-[13px] font-medium text-primary-foreground hover:bg-[#0b2a25]"
                    >
                      <Sparkles className="size-4" aria-hidden />
                      Start trip from selected
                      <ArrowRight className="size-4" aria-hidden />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 py-16 md:px-10">
          <div className="flex items-end justify-between">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Trips in this collection</div>
              <h2 className="mt-2 font-display text-[clamp(1.6rem,3vw,2.4rem)] leading-tight tracking-tight text-primary">
                Saved by travelers,
                <br className="hidden md:block" /> curated by us.
              </h2>
            </div>
            <Link
              href="/explore?as=user"
              className="hidden items-center gap-1 text-[13px] font-medium text-primary hover:underline md:inline-flex"
            >
              Browse all trips <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>

          {isSelecting && (
            <div className="mt-6 flex items-start gap-3 rounded-2xl bg-secondary p-4 ring-1 ring-border">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-card text-primary ring-1 ring-border">
                <CheckCircle2 className="size-4" aria-hidden />
              </span>
              <div className="text-[13px] leading-relaxed text-foreground/80">
                <span className="font-medium text-foreground">Selection mode</span> — pick the trips whose covers you
                want SnapTrip to read. Up to 8 covers can seed your new plan.
              </div>
            </div>
          )}

          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {trips.map((t) => {
              const isSelected = Boolean(isSelecting && t.sourceImageId && usableImageIds.includes(t.sourceImageId))
              return (
                <div key={t.id} className="relative">
                  <TripCard trip={t} />
                  {isSelecting && (
                    <span
                      aria-hidden
                      className={
                        isSelected
                          ? "pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-primary"
                          : "pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-border/40"
                      }
                    />
                  )}
                  {isSelecting && (
                    <span
                      aria-label={isSelected ? "Selected" : "Not selected"}
                      className={
                        isSelected
                          ? "pointer-events-none absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-primary text-primary-foreground shadow"
                          : "pointer-events-none absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-card/95 text-muted-foreground ring-1 ring-border"
                      }
                    >
                      <CheckCircle2 className="size-4" aria-hidden />
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {isSelecting && (
          <div className="sticky bottom-4 z-20 mx-auto w-full max-w-6xl px-6 md:px-10">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-card p-4 ring-1 ring-border shadow-[0_30px_70px_-30px_rgba(29,36,32,0.4)]">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-secondary text-primary">
                  <Sparkles className="size-4" aria-hidden />
                </span>
                <div>
                  <p className="text-[13.5px] font-medium text-foreground">
                    {usableImageIds.length} of {trips.length} backend-owned covers selected
                  </p>
                  <p className="text-[12px] text-muted-foreground">
                    Continue to seed your new trip with these covers.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/collections/${collection.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-card px-4 py-2 text-[13px] font-medium text-foreground ring-1 ring-border hover:bg-secondary"
                >
                  Cancel
                </Link>
                <SourceImagesContinueButton
                  source="collection"
                  imageIds={usableImageIds}
                  fallbackHref="/new/upload"
                  label="Continue to review"
                />
              </div>
            </div>
          </div>
        )}

        <section className="mx-auto w-full max-w-6xl px-6 pb-24 md:px-10">
          <div className="rounded-3xl bg-secondary/60 p-8 ring-1 ring-border/70 md:p-10">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="max-w-xl">
                <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Make it yours</div>
                <h3 className="mt-2 font-display text-[clamp(1.6rem,3vw,2.2rem)] leading-tight tracking-tight text-primary">
                  Turn this collection into a real itinerary.
                </h3>
                <p className="mt-3 text-[14px] leading-relaxed text-foreground/75">
                  Pick the trips that match your style, then let SnapTrip build a structured plan with budget notes and
                  itinerary drafts you can refine.
                </p>
              </div>
              <Link
                href={`/signin?next=${encodeURIComponent(`/new/from-collections?seed=${collection.slug}`)}&action=plan`}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-[13px] font-medium text-primary-foreground hover:bg-[#0b2a25]"
              >
                Start planning <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  )
}
