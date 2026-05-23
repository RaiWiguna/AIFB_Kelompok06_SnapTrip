import Image from "next/image"
import Link from "next/link"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { ArrowLeft, ImageIcon, Plus, ShieldCheck, Trash2 } from "lucide-react"
import { AuthenticatedAppHeader } from "@/components/authenticated-app-header"
import { AppFooter } from "@/components/app-footer"
import { StepIndicator, NEW_TRIP_STEPS } from "@/components/step-indicator"
import { ApiError } from "@/lib/api/client"
import { getTripCreationSession } from "@/lib/api/trip-creation"
import { ClassifyButton } from "./classify-button"

export default async function ReviewImagesStepPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>
}) {
  const { session } = await searchParams
  if (!session) redirect("/new")

  let tripSession
  try {
    tripSession = await getTripCreationSession(session, (await cookies()).toString())
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect("/signin?next=%2Fnew%2Freview-images&action=plan")
    }
    if (error instanceof ApiError && error.status === 404) {
      redirect("/new")
    }
    throw error
  }

  const selected = tripSession.images.slice(0, 8)

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AuthenticatedAppHeader active="new" next="/new/review-images" action="plan" />
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
          <span className="text-foreground">Review images</span>
        </div>

        <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">
              Step 1 - Review images
            </div>
            <h1 className="mt-3 font-display text-[clamp(2rem,3.6vw,3rem)] leading-[1.04] tracking-[-0.02em] text-primary text-balance">
              Confirm what we&apos;ll
              <br /> read for your trip.
            </h1>
            <p className="mt-3 max-w-xl text-[14.5px] leading-relaxed text-foreground/75">
              These images will seed your category profile. You can drop any image, swap sources, or add more - up to 8
              - before classification begins.
            </p>
          </div>
          <StepIndicator current={1} steps={NEW_TRIP_STEPS} />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section>
            <div className="flex items-end justify-between">
              <h2 className="font-display text-[20px] tracking-tight text-primary">{selected.length} of 8 selected</h2>
              <div className="flex items-center gap-3 text-[12.5px]">
                <Link href={`/new/upload?session=${tripSession.id}`} className="font-medium text-primary hover:underline">
                  + Upload more
                </Link>
                <span aria-hidden className="text-border">/</span>
                <Link href="/new/likes" className="font-medium text-primary hover:underline">
                  Add from likes
                </Link>
                <span aria-hidden className="text-border">/</span>
                <Link href="/new/from-collections" className="font-medium text-primary hover:underline">
                  From collection
                </Link>
              </div>
            </div>

            {selected.length === 0 ? (
              <div className="mt-4 rounded-3xl bg-secondary/40 p-12 text-center ring-1 ring-border">
                <p className="font-display text-[24px] text-primary">No usable images yet.</p>
                <p className="mx-auto mt-2 max-w-md text-[13.5px] text-muted-foreground">
                  Upload JPG or PNG images to classify this trip.
                </p>
                <Link
                  href={`/new/upload?session=${tripSession.id}`}
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-[13px] font-medium text-primary-foreground hover:bg-[#0b2a25]"
                >
                  Upload images
                </Link>
              </div>
            ) : (
              <ul className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                {selected.map((image) => (
                  <li key={image.id} className="overflow-hidden rounded-2xl bg-card ring-1 ring-border">
                    <div className="relative aspect-square">
                      <Image src={image.url || "/placeholder.svg"} alt="" fill sizes="200px" className="object-cover" unoptimized />
                      <span className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-card/95 text-foreground ring-1 ring-border">
                        <Trash2 className="size-3.5" aria-hidden />
                      </span>
                      <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-card/95 px-2 py-0.5 text-[10.5px] font-medium text-foreground ring-1 ring-border">
                        {image.sourceLabel}
                      </span>
                    </div>
                    <div className="px-3 py-2">
                      <p className="truncate text-[12.5px] font-medium text-foreground">{image.filename}</p>
                    </div>
                  </li>
                ))}
                {selected.length < 8 && (
                  <li>
                    <Link
                      href={`/new/upload?session=${tripSession.id}`}
                      className="flex h-full min-h-[180px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card text-muted-foreground transition hover:border-primary/50 hover:text-primary"
                    >
                      <Plus className="size-5" aria-hidden />
                      <span className="text-[12.5px] font-medium">Add another</span>
                    </Link>
                  </li>
                )}
              </ul>
            )}

            <div className="mt-6 rounded-2xl bg-secondary/60 p-4 text-[12.5px] leading-relaxed text-foreground/80 ring-1 ring-border">
              Once you continue, SnapTrip reads each image and reports a category profile. You can still adjust the
              categories on the next screen - nothing is committed yet.
            </div>
          </section>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl bg-card p-5 ring-1 ring-border">
              <h3 className="font-display text-[18px] tracking-tight text-primary">What happens next</h3>
              <ol className="mt-3 space-y-3 text-[13px] leading-relaxed text-foreground/80">
                <li className="flex items-start gap-2">
                  <ImageIcon className="mt-0.5 size-3.5 text-primary" aria-hidden />
                  Each image gets a per-image category prediction with a confidence score.
                </li>
                <li className="flex items-start gap-2">
                  <ImageIcon className="mt-0.5 size-3.5 text-primary" aria-hidden />
                  You confirm or correct the canonical categories before recommendations are built.
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 size-3.5 text-[color:var(--color-success)]" aria-hidden />
                  Images stay private to your account. They are not used for model training.
                </li>
              </ol>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <Link
                href="/new"
                className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2.5 text-[13px] font-medium text-foreground ring-1 ring-border hover:bg-secondary"
              >
                <ArrowLeft className="size-3.5" aria-hidden />
                Change source
              </Link>
              <ClassifyButton sessionId={tripSession.id} disabled={selected.length === 0} />
            </div>
          </aside>
        </div>
      </main>
      <AppFooter />
    </div>
  )
}
