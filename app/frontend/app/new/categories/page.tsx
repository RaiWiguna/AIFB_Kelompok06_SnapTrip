import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react"
import { AppHeader } from "@/components/app-header"
import { AppFooter } from "@/components/app-footer"
import { CategoryIcon } from "@/components/category-icon"
import { StepIndicator, NEW_TRIP_STEPS } from "@/components/step-indicator"
import { CATEGORIES, IMG, PREFERENCE_RESULT } from "@/lib/data"

const SOURCE_IMAGES = [
  { src: IMG.diamondBeach, label: "Pantai", icon: "pantai" as const, conf: 92 },
  { src: IMG.bromoTengger, label: "Gunung", icon: "gunung" as const, conf: 88 },
  { src: IMG.baliCoastalPano, label: "Air Terjun", icon: "air_terjun" as const, conf: 71 },
  { src: IMG.baliWomanTemple, label: "Wisata Tradisional", icon: "wisata_tradisional" as const, conf: 64 },
]

export default function CategoriesStepPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader active="new" />
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-6 pb-20 pt-6 md:px-10">
        <div className="mb-2 flex items-center gap-2 text-[12px] text-muted-foreground">
          <Link href="/" className="hover:text-primary">
            Home
          </Link>
          <span aria-hidden>/</span>
          <Link href="/new" className="hover:text-primary">
            New trip
          </Link>
          <span aria-hidden>/</span>
          <span className="text-foreground">Categories</span>
        </div>

        <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Step 2 · Categories</div>
            <h1 className="mt-3 font-display text-[clamp(2.2rem,4vw,3.4rem)] leading-[1.04] tracking-[-0.02em] text-primary text-balance">
              Confirm what your <br /> images point to.
            </h1>
            <p className="mt-3 max-w-xl text-[14.5px] leading-relaxed text-foreground/75">
              The classifier is assistive. Adjust selections before recommendations are built — confirmed categories
              shape the rest of the plan.
            </p>
          </div>
          <StepIndicator current={2} steps={NEW_TRIP_STEPS} />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
          {/* Source images with predictions */}
          <section>
            <h2 className="font-display text-[20px] tracking-tight text-primary">Per-image predictions</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Each image is scored independently. Confidence is a hint, not a guarantee.
            </p>
            <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {SOURCE_IMAGES.map((img) => (
                <li
                  key={img.label}
                  className="overflow-hidden rounded-2xl bg-card ring-1 ring-border"
                >
                  <div className="relative aspect-[16/10]">
                    <Image src={img.src || "/placeholder.svg"} alt="" fill sizes="50vw" className="object-cover" />
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-card/95 px-2.5 py-1 text-[11.5px] font-medium text-foreground ring-1 ring-border">
                      <CategoryIcon id={img.icon} className="text-primary" />
                      {img.label}
                    </span>
                    <span className="absolute right-3 top-3 inline-flex rounded-full bg-card/95 px-2.5 py-1 text-[11.5px] font-medium text-primary ring-1 ring-border">
                      {img.conf}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <span className="text-[12.5px] text-muted-foreground">Predicted: {img.label}</span>
                    <button
                      type="button"
                      className="text-[12.5px] font-medium text-primary hover:underline"
                    >
                      Reassign
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {/* Manual override */}
            <div className="mt-6 rounded-2xl bg-card p-4 ring-1 ring-border">
              <h3 className="font-display text-[18px] tracking-tight text-primary">Manual override</h3>
              <p className="mt-1 text-[12.5px] text-muted-foreground">
                Toggle which canonical categories should drive your recommendations.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {CATEGORIES.map((c, i) => {
                  const active = i < 3
                  return (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={active}
                      className={
                        active
                          ? "inline-flex items-center gap-2 rounded-full bg-primary px-3.5 py-2 text-[12.5px] font-medium text-primary-foreground"
                          : "inline-flex items-center gap-2 rounded-full bg-secondary px-3.5 py-2 text-[12.5px] font-medium text-foreground ring-1 ring-border hover:ring-primary/40"
                      }
                    >
                      <CategoryIcon id={c.id} className={active ? "text-primary-foreground" : "text-primary"} />
                      {c.label}
                    </button>
                  )
                })}
              </div>
              <p className="mt-3 text-[12px] text-muted-foreground">
                Only canonical category IDs move forward. Manual confirmation overrides classifier confidence.
              </p>
            </div>
          </section>

          {/* Preferences sidebar */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl bg-card p-6 ring-1 ring-border shadow-[0_30px_80px_-30px_rgba(29,36,32,0.35)]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 text-[15px] font-semibold">
                    Trip preferences <Sparkles className="size-3.5 text-accent" aria-hidden />
                  </div>
                  <div className="text-[12.5px] text-muted-foreground">Aggregated across your images</div>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {PREFERENCE_RESULT.scores.map((s) => (
                  <div key={s.id} className="grid grid-cols-[28px_1fr_42px] items-center gap-3">
                    <CategoryIcon id={s.id} className="text-primary" />
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[13.5px] font-medium">{s.label}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${s.value}%` }} aria-hidden />
                      </div>
                    </div>
                    <span className="text-right text-[12px] text-muted-foreground">{s.value}%</span>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <div className="text-[13px] font-medium">Trip vibe</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {PREFERENCE_RESULT.vibes.map((v) => (
                    <span
                      key={v}
                      className="rounded-full bg-secondary px-2.5 py-1 text-[12px] text-foreground/80 ring-1 ring-border"
                    >
                      {v}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex items-start gap-2 rounded-xl bg-secondary p-3 text-[12.5px] text-foreground/80 ring-1 ring-border">
                <Sparkles className="mt-0.5 size-3.5 text-accent" aria-hidden />
                <span>We&apos;ll use these preferences to shape your recommended trip.</span>
              </div>

              <div className="mt-5 flex items-center gap-2">
                <Link
                  href="/new/upload"
                  className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2.5 text-[13px] font-medium text-foreground ring-1 ring-border hover:bg-secondary"
                >
                  <ArrowLeft className="size-3.5" aria-hidden />
                  Back
                </Link>
                <Link
                  href="/new/recommendations"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-[13.5px] font-medium text-primary-foreground hover:bg-[#0b2a25]"
                >
                  Build recommendations
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </main>
      <AppFooter />
    </div>
  )
}
