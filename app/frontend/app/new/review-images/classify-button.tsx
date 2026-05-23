"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight } from "lucide-react"
import { ApiError } from "@/lib/api/client"
import { classifyTripCreationSession } from "@/lib/api/trip-creation"

export function ClassifyButton({ sessionId, disabled }: { sessionId: string; disabled?: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  async function classify() {
    if (disabled || busy) return
    setBusy(true)
    setError("")
    try {
      await classifyTripCreationSession(sessionId)
      router.push(`/new/categories?session=${sessionId}`)
      router.refresh()
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        window.location.href = "/signin?next=%2Fnew%2Freview-images&action=plan"
        return
      }
      setError(err instanceof Error ? err.message : "Image classification failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-2">
      <button
        type="button"
        disabled={disabled || busy}
        onClick={classify}
        className={
          disabled || busy
            ? "inline-flex flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-full bg-secondary px-4 py-2.5 text-[13.5px] font-medium text-muted-foreground ring-1 ring-border"
            : "inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-[13.5px] font-medium text-primary-foreground hover:bg-[#0b2a25]"
        }
      >
        {busy ? "Reading images..." : "Read images"}
        <ArrowRight className="size-3.5" aria-hidden />
      </button>
      {error && <p className="text-[12px] text-[color:var(--color-error)]">{error}</p>}
    </div>
  )
}
