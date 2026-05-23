"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Clock,
  Coins,
  Lightbulb,
  MapPin,
  Sparkles,
  Target,
} from "lucide-react"
import { AppHeader, type AppHeaderUser } from "@/components/app-header"
import { AppFooter } from "@/components/app-footer"
import { StepIndicator, NEW_TRIP_STEPS } from "@/components/step-indicator"
import { IMG } from "@/lib/data"
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
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSession.selectedRecommendationIds)
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
          if (!selectedIds.length) {
            setSelectedIds(generated.items.slice(0, 2).map((item) => item.id))
          }
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
    setSelectedIds((current) =>
      current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId],
    )
  }

  async function openPlanner() {
    if (!selectedIds.length) {
      setError("Select at least one destination.")
      return
    }
    setBusy(true)
    setError("")
    try {
      await selectRecommendations(initialSession.id, selectedIds)
      router.push(`/plan/${initialSession.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save selected destinations")
    } finally {
      setBusy(false)
    }
  }

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
          Tip: You can fine-tune these picks in the next step.
        </div>

        <div className="mt-6 flex items-center justify-between gap-4 rounded-3xl bg-card p-4 ring-1 ring-border">
          <p className="text-[13px] text-muted-foreground">
            <span className="font-medium text-foreground">{selectedIds.length} selected</span> - Selected destinations
            seed your AI Trip Planner session.
          </p>
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
              disabled={busy || !selectedIds.length}
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
          <Row icon={<Clock className="size-3.5" aria-hidden />} label="Est. time" value={rec.estTime} />
          <Row icon={<Coins className="size-3.5" aria-hidden />} label="Est. budget" value={rec.estBudget} />
          <Row icon={<MapPin className="size-3.5" aria-hidden />} label="Region" value={rec.region} />
          {rec.hours && <Row icon={<Clock className="size-3.5" aria-hidden />} label="Hours" value={rec.hours} />}
        </dl>

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
