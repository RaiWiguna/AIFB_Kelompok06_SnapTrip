import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Heart } from "lucide-react"
import { AppHeader } from "@/components/app-header"
import { AppFooter } from "@/components/app-footer"
import { StepIndicator, NEW_TRIP_STEPS } from "@/components/step-indicator"
import { LIKED_TRIP_IDS, TRIPS } from "@/lib/data"

export default function NewFromLikesPage() {
  const liked = TRIPS.filter((t) => LIKED_TRIP_IDS.includes(t.id))

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
          <span className="text-foreground">From likes</span>
        </div>

        <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Step 1 · From likes</div>
            <h1 className="mt-3 font-display text-[clamp(2rem,3.6vw,3rem)] leading-[1.04] tracking-[-0.02em] text-primary text-balance">
              Pick from trips
              <br /> you&apos;ve liked.
            </h1>
            <p className="mt-3 max-w-xl text-[14.5px] leading-relaxed text-foreground/75">
              Up to 8 covers can seed your new trip. We&apos;ll read them as if you&apos;d uploaded them yourself.
            </p>
          </div>
          <StepIndicator current={1} steps={NEW_TRIP_STEPS} />
        </div>

        <section className="mt-8">
          {liked.length === 0 ? (
            <div className="rounded-3xl bg-secondary/40 p-12 text-center ring-1 ring-border">
              <p className="font-display text-[24px] text-primary">No likes yet.</p>
              <p className="mx-auto mt-2 max-w-md text-[13.5px] text-muted-foreground">
                Browse Explore and like a few trips to seed this flow.
              </p>
              <Link
                href="/explore"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-[13px] font-medium text-primary-foreground hover:bg-[#0b2a25]"
              >
                Open Explore
              </Link>
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {liked.map((t, i) => {
                const selected = i < 4
                return (
                  <li
                    key={t.id}
                    className={
                      selected
                        ? "relative overflow-hidden rounded-2xl bg-card ring-2 ring-primary"
                        : "relative overflow-hidden rounded-2xl bg-card ring-1 ring-border hover:ring-primary/40"
                    }
                  >
                    <div className="relative aspect-[4/3]">
                      <Image src={t.cover || "/placeholder.svg"} alt="" fill sizes="33vw" className="object-cover" />
                      <span
                        className={
                          selected
                            ? "absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-primary text-primary-foreground"
                            : "absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-card text-muted-foreground ring-1 ring-border"
                        }
                        aria-hidden
                      >
                        <Heart className={selected ? "size-3.5 fill-current" : "size-3.5"} />
                      </span>
                    </div>
                    <div className="px-3 py-2.5">
                      <p className="truncate font-display text-[15px] text-primary">{t.title}</p>
                      <p className="truncate text-[11.5px] text-muted-foreground">{t.region}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <div className="mt-8 flex items-center justify-between gap-4 rounded-3xl bg-card p-4 ring-1 ring-border">
          <p className="text-[13px] text-muted-foreground">
            <span className="font-medium text-foreground">4 of {Math.min(liked.length, 8)}</span> selected · max 8 images.
          </p>
          <div className="flex items-center gap-2">
            <Link
              href="/new"
              className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2.5 text-[13px] font-medium text-foreground ring-1 ring-border hover:bg-secondary"
            >
              <ArrowLeft className="size-3.5" aria-hidden />
              Back
            </Link>
            <Link
              href="/new/review-images"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-[13.5px] font-medium text-primary-foreground hover:bg-[#0b2a25]"
            >
              Review selection
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        </div>
      </main>
      <AppFooter />
    </div>
  )
}
