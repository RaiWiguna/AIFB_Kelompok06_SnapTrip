import Image from "next/image"
import Link from "next/link"
import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  BookOpen,
  Calendar,
  Car,
  ChevronRight,
  Coins,
  Eye,
  Heart,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Play,
  Receipt,
  Share2,
  ShieldCheck,
  Star,
  Ticket,
  Users,
  Utensils,
  Wallet,
} from "lucide-react"
import { AppHeader } from "@/components/app-header"
import { AppFooter } from "@/components/app-footer"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { TripDayRow } from "@/components/trip-day-row"
import { TripOwnerControls } from "@/components/trip-owner-controls"
import { TripParticipants } from "@/components/trip-participants"
import { TripRouteMap } from "@/components/trip-route-map"
import { ApiError } from "@/lib/api/client"
import { getTripPlanDetail } from "@/lib/api/trip-plans"
import { getOptionalAppHeaderUser } from "@/lib/server-auth"

export default async function TripDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ as?: string }>
}) {
  const { id } = await params
  const { as } = await searchParams
  const cookieHeader = (await cookies()).toString()
  let trip
  try {
    trip = await getTripPlanDetail(id, cookieHeader)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound()
    if (error instanceof ApiError && error.status === 403) redirect("/forbidden")
    throw error
  }
  const headerUser = await getOptionalAppHeaderUser(cookieHeader)
  const t = trip.summary
  const detail = trip.detail
  const detailFull = trip.detail
  const exploreHref = headerUser ? "/explore?as=user" : "/explore"
  const isOwnerView = as === "owner" && headerUser?.id === t.ownerId

  const galleryThumbs = detail.galleryThumbs.slice(0, 6)

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {headerUser ? <AppHeader active="trips" user={headerUser} /> : <SiteHeader active="explore" />}

      <main className="mx-auto w-full max-w-[1480px] flex-1 px-6 pt-6 pb-10 md:px-10">
        {/* ---------------- Hero (top viewport) ---------------- */}
        <section className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)]">
          {/* Left: title + meta */}
          <div className="flex flex-col">
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <Link href={exploreHref} className="hover:text-foreground">
                Explore
              </Link>
              <ChevronRight className="size-3.5" aria-hidden />
              <Link href={exploreHref} className="hover:text-foreground">
                Public Trips
              </Link>
              <ChevronRight className="size-3.5" aria-hidden />
              <span className="text-foreground/80">{t.title}</span>
            </nav>

            <h1 className="mt-5 font-display text-[clamp(2.2rem,3.6vw,3.4rem)] leading-[1.04] tracking-[-0.02em] text-primary text-balance">
              {t.title}
            </h1>

            <p className="mt-4 max-w-md text-[14.5px] leading-relaxed text-foreground/75">{t.description}</p>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {t.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-card px-3 py-1 text-[12px] font-medium text-foreground/80 ring-1 ring-border/70"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-start gap-x-7 gap-y-3">
              <Stat
                icon={<Calendar className="size-4" aria-hidden />}
                label={`${t.durationDays} days`}
                sub={`${t.durationNights} nights`}
              />
              <Stat
                icon={<Wallet className="size-4" aria-hidden />}
                label="Est. budget"
                value={t.estBudget}
                sub="per person"
              />
              <Stat
                icon={<Users className="size-4" aria-hidden />}
                label={t.travelers}
                sub="travelers"
              />
            </div>

            {/* Engagement row */}
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-muted-foreground">
              <Engagement icon={<Heart className="size-3.5" aria-hidden />} value={t.likesK} label="Likes" />
              <Engagement icon={<Bookmark className="size-3.5" aria-hidden />} value={String(t.saves)} label="Saves" />
              <Engagement
                icon={<MessageCircle className="size-3.5" aria-hidden />}
                value={String(t.comments)}
                label="Comments"
              />
              <Engagement
                icon={<Eye className="size-3.5" aria-hidden />}
                value={`${(t.views / 1000).toFixed(1)}K`}
                label="Views"
              />
            </div>

            <p className="mt-3 text-[12px] text-muted-foreground">Last updated {t.lastUpdated}</p>
          </div>

          {/* Right: hero image + actions + thumbs */}
          <div className="relative">
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[20px] ring-1 ring-border/70">
              <Image src={detail.galleryThumbs[0]?.src || t.cover} alt={t.title} fill className="object-cover" priority sizes="60vw" unoptimized />
              {/* Top action cluster */}
              <div className="absolute right-4 top-4 flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-full bg-card/95 px-3.5 py-2 text-[13px] font-medium text-foreground ring-1 ring-border/70 backdrop-blur hover:bg-card"
                >
                  <Share2 className="size-3.5" aria-hidden />
                  Share
                </button>
                <button
                  type="button"
                  aria-label="More options"
                  className="grid size-9 place-items-center rounded-full bg-card/95 ring-1 ring-border/70 backdrop-blur hover:bg-card"
                >
                  <MoreHorizontal className="size-4 text-foreground" aria-hidden />
                </button>
                {isOwnerView ? (
                  <Link
                    href={`/plan/${id}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground hover:bg-[#0b2a25]"
                  >
                    Edit plan
                    <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                ) : null}
              </div>

              {/* Editor's pick badge */}
              <span className="absolute left-1/2 top-4 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-card/90 px-3 py-1.5 text-[12px] font-medium text-foreground ring-1 ring-border/70 backdrop-blur">
                <Star className="size-3.5 fill-[#e0a83c] text-[#e0a83c]" aria-hidden />
                Editor&apos;s Pick
              </span>

              {/* Thumbnail strip */}
              <div className="absolute inset-x-4 bottom-4 flex items-center gap-2">
                <button
                  type="button"
                  className="relative aspect-square w-[clamp(56px,7vw,84px)] shrink-0 overflow-hidden rounded-xl ring-2 ring-card"
                  aria-label="Play trip video"
                >
                  <Image src={detail.galleryThumbs[0].src} alt="" fill className="object-cover" sizes="80px" />
                  <span className="absolute inset-0 grid place-items-center bg-foreground/20">
                    <span className="grid size-7 place-items-center rounded-full bg-card/95">
                      <Play className="size-3.5 fill-foreground text-foreground" aria-hidden />
                    </span>
                  </span>
                </button>
                {galleryThumbs.slice(1).map((thumb, i) => (
                  <div
                    key={i}
                    className="relative aspect-square w-[clamp(56px,7vw,84px)] shrink-0 overflow-hidden rounded-xl ring-2 ring-card"
                  >
                    <Image src={thumb.src} alt={thumb.alt} fill className="object-cover" sizes="80px" />
                  </div>
                ))}
                <button
                  type="button"
                  className="relative aspect-square w-[clamp(56px,7vw,84px)] shrink-0 overflow-hidden rounded-xl bg-foreground/40 text-[14px] font-semibold text-card ring-2 ring-card backdrop-blur"
                >
                  +{detail.galleryMore}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- Bottom row: 4 cards + budget strip ---------------- */}
        <section className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Author + public plan / owner controls */}
          <aside className="flex flex-col gap-5 lg:col-span-3">
            <div className="rounded-2xl bg-card p-5 ring-1 ring-border/70">
              <div className="flex items-center gap-3">
                <div className="relative size-12 shrink-0 overflow-hidden rounded-full bg-secondary ring-1 ring-border/70">
                  <Image src={t.owner.avatar} alt={t.owner.name} fill className="object-cover" sizes="48px" />
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[14px] font-medium text-foreground">
                    By {t.owner.name}
                    {t.owner.verified ? <ShieldCheck className="size-4 text-[#198754]" aria-hidden /> : null}
                  </p>
                  <p className="text-[12px] text-muted-foreground">Local Creator · Bali, Indonesia</p>
                </div>
              </div>
              <p className="mt-4 text-[13px] leading-relaxed text-foreground/75">{t.ownerBio}</p>
              <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                <Mini icon={<BookOpen className="size-3.5" aria-hidden />} value={String(t.ownerStats.trips)} label="Trips" />
                <Mini icon={<Users className="size-3.5" aria-hidden />} value={t.ownerStats.followers} label="Followers" />
                <Mini icon={<MapPin className="size-3.5" aria-hidden />} value={t.ownerStats.responseRate} label="Response rate" />
              </dl>
            </div>

            {isOwnerView ? (
              <div className="rounded-2xl bg-secondary/60 p-5 ring-1 ring-border/60">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="mt-0.5 size-4 text-foreground/70" aria-hidden />
                  <div>
                    <p className="text-[13.5px] font-medium text-foreground">You&apos;re viewing as owner</p>
                    <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                      Owner controls are pinned below the cards so this column stays balanced. Use them to manage
                      visibility, invites, and publishing.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-secondary/60 p-5 ring-1 ring-border/60">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="mt-0.5 size-4 text-foreground/70" aria-hidden />
                  <div>
                    <p className="text-[13.5px] font-medium text-foreground">This is a public trip plan</p>
                    <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                      Anyone can view this plan and use it as inspiration. Some details may be estimates and can be
                      adjusted to fit your own style and budget.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </aside>

          {/* Selected Destinations */}
          <article className="flex flex-col rounded-2xl bg-card p-5 ring-1 ring-border/70 lg:col-span-3">
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-foreground/70" aria-hidden />
              <h2 className="text-[14px] font-semibold text-foreground">Selected Destinations</h2>
            </div>

            <div className="mt-3">
              <TripRouteMap stops={detail.destinations} />
            </div>

            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-[12.5px]">
              {detail.destinations.map((d) => (
                <li key={d.order} className="flex items-start gap-2">
                  <span
                    aria-hidden
                    className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground"
                  >
                    {d.order}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{d.name}</p>
                    <p className="truncate text-[11.5px] text-muted-foreground">{d.region}</p>
                  </div>
                </li>
              ))}
            </ul>

            <Link
              href={`/trips/${id}/destinations`}
              className="mt-4 inline-flex items-center justify-between rounded-xl bg-secondary/60 px-4 py-2.5 text-[12.5px] font-medium text-foreground ring-1 ring-border/60 hover:bg-secondary"
            >
              View full map &amp; route
              <ArrowUpRight className="size-3.5" aria-hidden />
            </Link>
          </article>

          {/* Trip Memo */}
          <article className="flex flex-col rounded-2xl bg-card p-5 ring-1 ring-border/70 lg:col-span-3">
            <div className="flex items-center gap-2">
              <BookOpen className="size-4 text-foreground/70" aria-hidden />
              <h2 className="text-[14px] font-semibold text-foreground">Trip Memo</h2>
            </div>

            <div className="mt-3 grid grid-cols-4 gap-1.5">
              {detail.memoTiles.map((m, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-lg ring-1 ring-border/60">
                  <Image src={m.src} alt={m.alt} fill className="object-cover" sizes="80px" />
                </div>
              ))}
            </div>

            <p className="mt-4 line-clamp-5 text-[12.5px] leading-relaxed text-foreground/75">
              {detail.memoCaption || t.description}
            </p>

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-[11.5px] text-muted-foreground">
                {detail.memoSource} · {detail.memoItems} items
              </p>
              <Link
                href={`/trips/${id}/memo`}
                aria-label="Open full trip memo"
                className="grid size-8 place-items-center rounded-full bg-secondary/60 ring-1 ring-border/60 hover:bg-secondary"
              >
                <ArrowUpRight className="size-3.5 text-foreground" aria-hidden />
              </Link>
            </div>
          </article>

          {/* Full Itinerary */}
          <article className="flex flex-col rounded-2xl bg-card p-5 ring-1 ring-border/70 lg:col-span-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-foreground/70" aria-hidden />
                <h2 className="text-[14px] font-semibold text-foreground">Full Itinerary</h2>
              </div>
              <Link
                href={`/trips/${id}/itinerary`}
                className="inline-flex items-center gap-1 text-[12px] font-medium text-foreground/80 hover:text-foreground"
              >
                View full itinerary
                <ArrowUpRight className="size-3.5" aria-hidden />
              </Link>
            </div>

            <div className="mt-2 -mx-1">
              {detail.itinerary.map((day, i) => (
                <TripDayRow
                  key={day.day}
                  day={day}
                  isFirst={i === 0}
                  isLast={i === detail.itinerary.length - 1}
                />
              ))}
            </div>
          </article>

          {/* Owner row — slim controls + expandable participants, owner-only */}
          {isOwnerView ? (
            <div className="lg:col-span-12 grid grid-cols-1 gap-4 md:grid-cols-12">
              <div className="md:col-span-5">
                <TripOwnerControls
                  tripId={id}
                  plannerSessionId={t.plannerSessionId}
                  visibility={t.visibility}
                  invitesActive={Math.max(detailFull.participants.length - 1, 0)}
                />
              </div>
              <div className="md:col-span-7">
                <TripParticipants tripId={id} participants={detailFull.participants} />
              </div>
            </div>
          ) : null}

          {/* Budget Plan strip — full width */}
          <section className="lg:col-span-12 rounded-2xl bg-card p-5 ring-1 ring-border/70">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Receipt className="size-4 text-foreground/70" aria-hidden />
                <h2 className="text-[14px] font-semibold text-foreground">
                  Budget Plan <span className="font-normal text-muted-foreground">(Estimates)</span>
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-[11.5px] text-muted-foreground">
                  Costs can vary depending on season and preferences.
                </p>
                <Link
                  href={`/trips/${id}/budget`}
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-foreground/80 hover:text-foreground"
                >
                  View full budget
                  <ArrowUpRight className="size-3.5" aria-hidden />
                </Link>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
              <BudgetTile
                accent
                icon={<Wallet className="size-4" aria-hidden />}
                label="Estimated total"
                value={t.budget.total}
                sub="per person"
              />
              <BudgetTile
                icon={<BookOpen className="size-4" aria-hidden />}
                label="Accommodation"
                value={t.budget.accommodation.value}
                sub={t.budget.accommodation.note}
              />
              <BudgetTile
                icon={<Car className="size-4" aria-hidden />}
                label="Transport"
                value={t.budget.transport.value}
                sub={t.budget.transport.note}
              />
              <BudgetTile
                icon={<Utensils className="size-4" aria-hidden />}
                label="Meals"
                value={t.budget.meals.value}
                sub={t.budget.meals.note}
              />
              <BudgetTile
                icon={<Ticket className="size-4" aria-hidden />}
                label="Activities & Tickets"
                value={t.budget.activities.value}
                sub={t.budget.activities.note}
              />
              <BudgetTile
                icon={<Coins className="size-4" aria-hidden />}
                label="Other"
                value={t.budget.other.value}
                sub={t.budget.other.note}
              />
            </div>
          </section>
        </section>
      </main>

      {headerUser ? <AppFooter /> : <SiteFooter />}
    </div>
  )
}

/* ---------------- Small helpers ---------------- */

function Stat({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value?: string
  sub?: string
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-foreground/70">
        {icon}
      </span>
      <div className="min-w-0">
        {value ? <p className="text-[12px] text-muted-foreground">{label}</p> : null}
        <p className="text-[14px] font-medium text-foreground">{value ?? label}</p>
        {sub ? <p className="text-[12px] text-muted-foreground">{sub}</p> : null}
      </div>
    </div>
  )
}

function Engagement({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-foreground/60">{icon}</span>
      <span className="font-medium text-foreground">{value}</span>
      <span>{label}</span>
    </span>
  )
}

function Mini({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-foreground/60">{icon}</span>
      <span className="text-[13px] font-semibold text-foreground">{value}</span>
      <span className="text-[10.5px] text-muted-foreground">{label}</span>
    </div>
  )
}

function BudgetTile({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  accent?: boolean
}) {
  return (
    <div className="flex items-start gap-2.5">
      {accent ? null : (
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-foreground/70">
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <p className={`text-[11.5px] ${accent ? "text-muted-foreground" : "text-muted-foreground"}`}>{label}</p>
        <p className={`text-[14px] font-semibold ${accent ? "text-primary" : "text-foreground"}`}>{value}</p>
        {sub ? <p className="text-[11px] text-muted-foreground">{sub}</p> : null}
      </div>
    </div>
  )
}
