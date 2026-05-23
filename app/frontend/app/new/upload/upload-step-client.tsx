"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { ArrowLeft, ArrowRight, ImageIcon, Trash2, Upload } from "lucide-react"
import { AppHeader } from "@/components/app-header"
import { AppFooter } from "@/components/app-footer"
import { StepIndicator, NEW_TRIP_STEPS } from "@/components/step-indicator"
import { ApiError } from "@/lib/api/client"
import { createTripCreationSession, uploadTripImages } from "@/lib/api/trip-creation"
import type { TripCreationSessionDisplay, UploadedImageDisplay } from "@/lib/api/types"

const MAX_IMAGES = 8
const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png"])

export function UploadStepClient({ initialSession }: { initialSession?: TripCreationSessionDisplay | null }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [sessionId, setSessionId] = useState(initialSession?.id || "")
  const [images, setImages] = useState<UploadedImageDisplay[]>(initialSession?.images || [])
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  async function onFilesSelected(files: FileList | null) {
    setError("")
    const selected = Array.from(files || [])
    if (!selected.length) return
    if (images.length + selected.length > MAX_IMAGES) {
      setError(`Choose up to ${MAX_IMAGES} images total.`)
      return
    }
    const invalidType = selected.find((file) => !ACCEPTED_TYPES.has(file.type))
    if (invalidType) {
      setError("Only JPG and PNG images are supported.")
      return
    }
    const oversized = selected.find((file) => file.size > MAX_IMAGE_BYTES)
    if (oversized) {
      setError("Each image must be 8 MB or smaller.")
      return
    }

    setBusy(true)
    try {
      const activeSession = sessionId ? { id: sessionId } : await createTripCreationSession("upload")
      if (!sessionId) {
        setSessionId(activeSession.id)
        window.history.replaceState(null, "", `/new/upload?session=${activeSession.id}`)
      }
      await uploadTripImages(activeSession.id, selected)
      router.push(`/new/review-images?session=${activeSession.id}`)
      router.refresh()
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push("/signin?next=%2Fnew%2Fupload&action=plan")
        return
      }
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  const canReview = Boolean(sessionId && images.length > 0)

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
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Step 1 - Upload</div>
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
          <section>
            <label className="block">
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png"
                multiple
                className="sr-only"
                onChange={(event) => onFilesSelected(event.target.files)}
              />
              <div className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border bg-card px-6 py-12 text-center hover:border-primary/50 hover:bg-secondary/40">
                <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
                  <Upload className="size-5" aria-hidden />
                </span>
                <p className="mt-4 font-display text-[22px] tracking-tight text-primary">
                  {busy ? "Uploading images..." : "Drop images here, or click to choose"}
                </p>
                <p className="mt-2 text-[13px] text-muted-foreground">
                  1-8 images - JPG or PNG - up to 8 MB each
                </p>
              </div>
            </label>

            {error && (
              <div className="mt-4 rounded-2xl bg-[color:var(--color-sunset-wash)]/35 px-4 py-3 text-[12.5px] text-[color:var(--color-warning)] ring-1 ring-border">
                {error}
              </div>
            )}

            <div className="mt-6 flex items-end justify-between">
              <h2 className="font-display text-[20px] tracking-tight text-primary">
                Selected - {images.length} of 8
              </h2>
              <button
                type="button"
                onClick={() => setImages([])}
                className="text-[13px] font-medium text-muted-foreground hover:text-[color:var(--color-error)]"
              >
                Clear view
              </button>
            </div>

            <ul className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              {images.map((image) => (
                <li key={image.id} className="overflow-hidden rounded-2xl bg-card ring-1 ring-border">
                  <div className="relative aspect-square">
                    <Image src={image.url || "/placeholder.svg"} alt="" fill sizes="200px" className="object-cover" unoptimized />
                    <span className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-card/95 text-foreground ring-1 ring-border">
                      <Trash2 className="size-3.5" aria-hidden />
                    </span>
                  </div>
                  <div className="px-3 py-2">
                    <p className="truncate text-[12.5px] font-medium text-foreground">{image.filename}</p>
                    <p className="text-[11.5px] text-muted-foreground">{image.sizeLabel}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl bg-card p-5 ring-1 ring-border">
              <h3 className="font-display text-[18px] tracking-tight text-primary">Image tips</h3>
              <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-foreground/80">
                <li className="flex items-start gap-2">
                  <ImageIcon className="mt-0.5 size-3.5 text-primary" aria-hidden />
                  Pick images that represent the kind of trip you want - beaches, peaks, waterfalls, or heritage.
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
                href={canReview ? `/new/review-images?session=${sessionId}` : "/new/upload"}
                aria-disabled={!canReview}
                className={
                  canReview
                    ? "inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-[13.5px] font-medium text-primary-foreground hover:bg-[#0b2a25]"
                    : "inline-flex flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-full bg-secondary px-4 py-2.5 text-[13.5px] font-medium text-muted-foreground ring-1 ring-border"
                }
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
