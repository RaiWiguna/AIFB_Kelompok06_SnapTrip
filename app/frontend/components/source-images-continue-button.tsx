"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight } from "lucide-react"
import { addTripSourceImages, createTripCreationSession } from "@/lib/api/trip-creation"

export function SourceImagesContinueButton({
  source,
  imageIds,
  fallbackHref = "/new/upload",
  label = "Review selection",
}: {
  source: string
  imageIds: string[]
  fallbackHref?: string
  label?: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const usableIds = imageIds.slice(0, 8)

  async function continueFlow() {
    if (!usableIds.length) {
      router.push(fallbackHref)
      return
    }
    setBusy(true)
    setError("")
    try {
      const session = await createTripCreationSession(source)
      await addTripSourceImages(session.id, usableIds)
      router.push(`/new/review-images?session=${session.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start trip from selected images")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={continueFlow}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-[13.5px] font-medium text-primary-foreground hover:bg-[#0b2a25] disabled:cursor-not-allowed disabled:bg-secondary disabled:text-muted-foreground"
      >
        {busy ? "Preparing..." : usableIds.length ? label : "Upload images instead"}
        <ArrowRight className="size-3.5" aria-hidden />
      </button>
      {error && <p className="text-[12px] text-[color:var(--color-error)]">{error}</p>}
    </div>
  )
}
