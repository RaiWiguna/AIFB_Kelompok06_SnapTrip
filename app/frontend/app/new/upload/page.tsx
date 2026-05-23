import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, ArrowRight, ImageIcon, Trash2, Upload } from "lucide-react"
import { AppHeader } from "@/components/app-header"
import { AppFooter } from "@/components/app-footer"
import { StepIndicator, NEW_TRIP_STEPS } from "@/components/step-indicator"
import { IMG } from "@/lib/data"

const SELECTED = [
  { src: IMG.diamondBeach, name: "diamond-beach.jpg", size: "2.4 MB" },
  { src: IMG.bromoTengger, name: "bromo-sunrise.jpg", size: "3.1 MB" },
  { src: IMG.baliWomanTemple, name: "ubud-gate.jpg", size: "2.7 MB" },
  { src: IMG.baliCoastalPano, name: "amed-coast.jpg", size: "3.6 MB" },
]

export default function UploadStepPage() {
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
          <span className="text-foreground">Upload</span>
        </div>

        <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Step 1 · Upload</div>
            <h1 className="mt-3 font-display text-[clamp(2rem,3.6vw,3rem)] leading-[1.04] tracking-[-0.02em] text-primary text-balance">
              Add up to 8 images.
            </h1>
            <p className="mt-3 max-w-xl text-[14.5px] leading-relaxed text-foreground/75">
              JPG or PNG, up to 8 MB each. SnapTrip will read these to suggest categories and destinations.
            </p>
          </div>
          <StepIndicator current={1} steps={NEW_TRIP_STEPS} />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* Drop zone + selected images */}
          <section>
            <label className="block">
              <input type="file" accept="image/jpeg,image/png" multiple className="sr-only" />
              <div className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border bg-card px-6 py-12 text-center hover:border-primary/50 hover:bg-secondary/40">
                <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
                  <Upload className="size-5" aria-hidden />
                </span>
                <p className="mt-4 font-display text-[22px] tracking-tight text-primary">
                  Drop images here, or click to choose
                </p>
                <p className="mt-2 text-[13px] text-muted-foreground">
                  1–8 images · JPG or PNG · up to 8 MB each
                </p>
              </div>
            </label>

            <div className="mt-6 flex items-end justify-between">
              <h2 className="font-display text-[20px] tracking-tight text-primary">Selected · {SELECTED.length} of 8</h2>
              <button type="button" className="text-[13px] font-medium text-muted-foreground hover:text-[color:var(--color-error)]">
                Clear all
              </button>
            </div>

            <ul className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              {SELECTED.map((f) => (
                <li
                  key={f.name}
                  className="overflow-hidden rounded-2xl bg-card ring-1 ring-border"
                >
                  <div className="relative aspect-square">
                    <Image src={f.src || "/placeholder.svg"} alt="" fill sizes="200px" className="object-cover" />
                    <button
                      type="button"
                      aria-label={`Remove ${f.name}`}
                      className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-card/95 text-foreground ring-1 ring-border hover:text-[color:var(--color-error)]"
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </button>
                  </div>
                  <div className="px-3 py-2">
                    <p className="truncate text-[12.5px] font-medium text-foreground">{f.name}</p>
                    <p className="text-[11.5px] text-muted-foreground">{f.size}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Sidebar guidance */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl bg-card p-5 ring-1 ring-border">
              <h3 className="font-display text-[18px] tracking-tight text-primary">Image tips</h3>
              <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-foreground/80">
                <li className="flex items-start gap-2">
                  <ImageIcon className="mt-0.5 size-3.5 text-primary" aria-hidden />
                  Pick images that represent the kind of trip you want — beaches, peaks, waterfalls, or heritage.
                </li>
                <li className="flex items-start gap-2">
                  <ImageIcon className="mt-0.5 size-3.5 text-primary" aria-hidden />
                  Mixed categories are fine. The classifier reports the strongest signal.
                </li>
                <li className="flex items-start gap-2">
                  <ImageIcon className="mt-0.5 size-3.5 text-primary" aria-hidden />
                  Avoid screenshots with heavy text overlays.
                </li>
              </ul>
              <div className="mt-4 rounded-xl bg-secondary p-3 text-[12px] text-foreground/80 ring-1 ring-border">
                Your images stay private. They are stored in your account only and never used for model training.
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <Link
                href="/new"
                className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2.5 text-[13px] font-medium text-foreground ring-1 ring-border hover:bg-secondary"
              >
                <ArrowLeft className="size-3.5" aria-hidden />
                Back
              </Link>
              <Link
                href="/new/review-images"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-[13.5px] font-medium text-primary-foreground hover:bg-[#0b2a25]"
              >
                Review selection
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </div>
          </aside>
        </div>
      </main>
      <AppFooter />
    </div>
  )
}
