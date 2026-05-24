"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Clock,
  Coins,
  ExternalLink,
  Lightbulb,
  MapPin,
  MessageSquareText,
  Sparkles,
  Star,
  Target,
  Users,
} from "lucide-react"
import { AppHeader, type AppHeaderUser } from "@/components/app-header"
import { AppFooter } from "@/components/app-footer"
import { StepIndicator, NEW_TRIP_STEPS } from "@/components/step-indicator"
import { IMG } from "@/lib/data"
import { createPlannerSessionFromTripCreation } from "@/lib/api/planner-sessions"
import { generateRecommendations, selectRecommendations } from "@/lib/api/recommendations"
import type { RecommendationCardDisplay, TripCreationSessionDisplay } from "@/lib/api/types"

export function RecommendationsStepClient({
  initialSession,
  headerUser,
}: {
  initialSession: TripCreationSessionDisplay
  headerUser: AppHeaderUser
}) {
  const router = useRouter()
  const [items, setItems] = useState<RecommendationCardDisplay[]>(initialSession.recommendations?.items || [])
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSession.selectedRecommendationIds.slice(0, 1))
  const [travelStartDate, setTravelStartDate] = useState(initialSession.travelStartDate || "")
  const [travelEndDate, setTravelEndDate] = useState(initialSession.travelEndDate || "")
  const [travelerCount, setTravelerCount] = useState(
    initialSession.travelerCount ? String(initialSession.travelerCount) : "",
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    async function loadRecommendations() {
      if (items.length) return
      setBusy(true)
      setError("")
      try {
        const generated = await generateRecommendations(initialSession.id, selectedIds)
        if (!cancelled) {
          setItems(generated.items)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Recommendation generation failed")
      } finally {
        if (!cancelled) setBusy(false)
      }
    }
    loadRecommendations()
    return () => {
      cancelled = true
    }
  }, [initialSession.id, items.length, selectedIds])

  function toggle(itemId: string) {
    setSelectedIds((current) => (current.includes(itemId) ? [] : [itemId]))
  }

  async function openPlanner() {
    const people = Number.parseInt(travelerCount, 10)
    if (selectedIds.length !== 1) {
      setError("Select exactly one destination.")
      return
    }
    if (!travelStartDate || !travelEndDate || travelEndDate < travelStartDate) {
      setError("Choose a valid start and end date.")
      return
    }
    if (!Number.isFinite(people) || people < 1 || people > 20) {
      setError("Choose a traveler count between 1 and 20.")
      return
    }
    setBusy(true)
    setError("")
    try {
      await selectRecommendations(initialSession.id, selectedIds)
      const planner = await createPlannerSessionFromTripCreation(initialSession.id, {
        recommendation_item_id: selectedIds[0],
        travel_start_date: travelStartDate,
        travel_end_date: travelEndDate,
        traveler_count: people,
      })
      router.push(`/plan/${planner.sessionId}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open AI Trip Planner")
    } finally {
      setBusy(false)
    }
  }

  const people = Number.parseInt(travelerCount, 10)
  const datesValid = Boolean(travelStartDate && travelEndDate && travelEndDate >= travelStartDate)
  const peopleValid = Number.isFinite(people) && people >= 1 && people <= 20
  const canOpenPlanner = selectedIds.length === 1 && datesValid && peopleValid

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px] opacity-50">
        <Image src={IMG.indonesiaMap || "/placeholder.svg"} alt="" fill sizes="100vw" className="object-cover object-top" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/60 to-background" />
      </div>

      <AppHeader active="new" user={headerUser} />

      <main className="mx-auto w-full max-w-[1480px] flex-1 px-6 pb-24 pt-6 md:px-10">
        <div className="mb-2 flex items-center gap-2 text-[12px] text-muted-foreground">
          <Link href="/" className="hover:text-primary">
            Home
          </Link>
          <span aria-hidden>/</span>
          <Link href="/new" className="hover:text-primary">
            New trip
          </Link>
          <span aria-hidden>/</span>
          <span className="text-foreground">Recommendations</span>
        </div>

        <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">
              Step 3 - Recommendations
            </div>
            <h1 className="mt-3 font-display text-[clamp(2.4rem,4.4vw,3.8rem)] leading-[1.02] tracking-[-0.02em] text-primary text-balance">
              See destinations <br /> that match your trip.
            </h1>
            <p className="mt-3 text-[14.5px] leading-relaxed text-foreground/75">
              Review destination options with hours, budget estimates, location context, and match reasons before you
              start planning.
            </p>
          </div>
          <StepIndicator current={3} steps={NEW_TRIP_STEPS} />
        </div>

        <div className="mt-8 inline-flex items-center gap-3 rounded-2xl bg-primary px-4 py-2.5 text-primary-foreground">
          <span className="grid size-7 place-items-center rounded-md bg-white/10">
            <Sparkles className="size-4" aria-hidden />
          </span>
          <div>
            <p className="text-[13px] font-medium">Recommendations for your trip</p>
            <p className="text-[12px] text-mist/85">
              {initialSession.confirmedCategories.join(", ") || "Confirmed categories"}
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-5 rounded-2xl bg-[color:var(--color-sunset-wash)]/35 px-4 py-3 text-[12.5px] text-[color:var(--color-warning)] ring-1 ring-border">
            {error}
          </div>
        )}

        {busy && !items.length ? (
          <div className="mt-6 rounded-3xl bg-card p-10 text-center ring-1 ring-border">
            <p className="font-display text-[24px] text-primary">Building recommendation cards...</p>
            <p className="mt-2 text-[13.5px] text-muted-foreground">
              Provider-disabled local runs use SnapTrip&apos;s deterministic destination fallback.
            </p>
          </div>
        ) : (
          <ul className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {items.map((item) => (
              <li key={item.id}>
                <RecommendationCard rec={item} selected={selectedIds.includes(item.id)} onToggle={() => toggle(item.id)} />
              </li>
            ))}
          </ul>
        )}

        <div className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 text-[12.5px] text-foreground/80 ring-1 ring-border">
          <Lightbulb className="size-3.5 text-accent" aria-hidden />
          Tip: choose one destination, dates, and group size before opening the agent planner.
        </div>

        <div className="mt-6 grid gap-4 rounded-3xl bg-card p-4 ring-1 ring-border lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-[13px] text-muted-foreground">
              <span className="font-medium text-foreground">{selectedIds.length} selected</span> - Select exactly one
              destination for the AI Trip Planner session.
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_150px]">
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-foreground">
                  <CalendarDays className="size-3.5 text-primary" aria-hidden />
                  Start date
                </span>
                <input
                  type="date"
                  value={travelStartDate}
                  onChange={(event) => setTravelStartDate(event.target.value)}
                  className="h-10 w-full rounded-full bg-secondary px-3 text-[13px] text-foreground ring-1 ring-border outline-none focus:ring-primary"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-foreground">
                  <CalendarDays className="size-3.5 text-primary" aria-hidden />
                  End date
                </span>
                <input
                  type="date"
                  value={travelEndDate}
                  min={travelStartDate || undefined}
                  onChange={(event) => setTravelEndDate(event.target.value)}
                  className="h-10 w-full rounded-full bg-secondary px-3 text-[13px] text-foreground ring-1 ring-border outline-none focus:ring-primary"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-foreground">
                  <Users className="size-3.5 text-primary" aria-hidden />
                  People
                </span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={travelerCount}
                  onChange={(event) => setTravelerCount(event.target.value)}
                  className="h-10 w-full rounded-full bg-secondary px-3 text-[13px] text-foreground ring-1 ring-border outline-none focus:ring-primary"
                  placeholder="e.g. 2"
                />
              </label>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/new/categories?session=${initialSession.id}`}
              className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2.5 text-[13px] font-medium text-foreground ring-1 ring-border hover:bg-secondary"
            >
              <ArrowLeft className="size-3.5" aria-hidden />
              Back
            </Link>
            <button
              type="button"
              onClick={openPlanner}
              disabled={busy || !canOpenPlanner}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-[13.5px] font-medium text-primary-foreground hover:bg-[#0b2a25] disabled:cursor-not-allowed disabled:bg-secondary disabled:text-muted-foreground"
            >
              {busy ? "Saving..." : "Open AI Trip Planner"}
              <ArrowRight className="size-3.5" aria-hidden />
            </button>
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  )
}

function RecommendationCard({
  rec,
  selected,
  onToggle,
}: {
  rec: RecommendationCardDisplay
  selected?: boolean
  onToggle: () => void
}) {
  return (
    <article
      className={
        selected
          ? "flex h-full flex-col overflow-hidden rounded-3xl bg-card ring-2 ring-primary"
          : "flex h-full flex-col overflow-hidden rounded-3xl bg-card ring-1 ring-border hover:ring-primary/40"
      }
    >
      <div className="relative aspect-[16/11]">
        <Image src={rec.cover || "/placeholder.svg"} alt={rec.name} fill sizes="33vw" className="object-cover" unoptimized />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-card/95 px-2.5 py-1 text-[11.5px] font-medium text-primary ring-1 ring-border">
          <Sparkles className="size-3 text-accent" aria-hidden />
          {rec.match}% match
        </span>
        {selected && (
          <span className="absolute right-3 top-3 inline-flex rounded-full bg-primary px-2.5 py-1 text-[11.5px] font-medium text-primary-foreground">
            Selected
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-[22px] leading-tight tracking-tight text-primary">{rec.name}</h3>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">
          {rec.category} - {rec.subCategory}
        </p>

        <dl className="mt-4 space-y-3 text-[13px]">
          <Row icon={<Sparkles className="size-3.5" aria-hidden />} label="Description" value={rec.description} />
          <Row icon={<Coins className="size-3.5" aria-hidden />} label="Est. budget" value={rec.estBudget} />
          {typeof rec.rating === "number" && (
            <Row
              icon={<Star className="size-3.5" aria-hidden />}
              label="Rating"
              value={`${rec.rating.toFixed(1)}${rec.userRatingCount ? ` (${rec.userRatingCount.toLocaleString()} reviews)` : ""}`}
            />
          )}
          <Row icon={<MapPin className="size-3.5" aria-hidden />} label="Address" value={rec.address || rec.region} />
          {rec.hours && <Row icon={<Clock className="size-3.5" aria-hidden />} label="Hours" value={rec.hours} />}
        </dl>

        {rec.reviewSummary && (
          <div className="mt-4 rounded-xl bg-background/70 p-3 text-[12.5px] leading-relaxed text-foreground/80 ring-1 ring-border">
            <div className="flex items-center gap-1.5 text-[12px] font-medium text-foreground">
              <MessageSquareText className="size-3.5 text-accent" aria-hidden />
              Review summary
            </div>
            <p className="mt-1.5">{rec.reviewSummary}</p>
          </div>
        )}

        <div className="mt-4 rounded-xl bg-secondary p-3 text-[12.5px] leading-relaxed text-foreground/80 ring-1 ring-border">
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-foreground">
            <Target className="size-3.5 text-primary" aria-hidden />
            Why it&apos;s a match
          </div>
          <p className="mt-1.5">{rec.reason}</p>
        </div>

        {rec.estimateNote && (
          <div className="mt-3 inline-flex items-start gap-1.5 rounded-xl bg-[color:var(--color-sunset-wash)]/35 px-2.5 py-2 text-[11.5px] leading-relaxed text-[color:var(--color-warning)]">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {rec.estimateNote}
          </div>
        )}

        <div className="mt-auto pt-4">
          <div className="mb-2 grid grid-cols-2 gap-2">
            {rec.googleMapsUri && (
              <a
                href={rec.googleMapsUri}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-secondary px-3 py-2 text-[12px] font-medium text-foreground ring-1 ring-border transition hover:bg-background active:scale-[0.98]"
              >
                <MapPin className="size-3.5" aria-hidden />
                Maps
                <ExternalLink className="size-3" aria-hidden />
              </a>
            )}
            {rec.websiteUri && (
              <a
                href={rec.websiteUri}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-secondary px-3 py-2 text-[12px] font-medium text-foreground ring-1 ring-border transition hover:bg-background active:scale-[0.98]"
              >
                Website
                <ExternalLink className="size-3" aria-hidden />
              </a>
            )}
          </div>
          <button
            type="button"
            onClick={onToggle}
            className={
              selected
                ? "inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-[13px] font-medium text-primary-foreground"
                : "inline-flex w-full items-center justify-center gap-2 rounded-full bg-secondary px-4 py-2.5 text-[13px] font-medium text-foreground ring-1 ring-border"
            }
          >
            {selected ? "Selected" : "Add to plan"}
          </button>
        </div>
      </div>
    </article>
  )
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="grid grid-cols-[18px_1fr] items-start gap-3">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div>
        <p className="text-[11.5px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-[13px] text-foreground">{value}</p>
      </div>
    </div>
  )
}
