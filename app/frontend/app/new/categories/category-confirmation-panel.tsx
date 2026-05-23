"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { CategoryIcon } from "@/components/category-icon"
import { ApiError } from "@/lib/api/client"
import { confirmTripCategories } from "@/lib/api/trip-creation"
import { CATEGORIES, type CategoryId } from "@/lib/categories"

export function CategoryConfirmationPanel({
  sessionId,
  defaults,
}: {
  sessionId: string
  defaults: CategoryId[]
}) {
  const router = useRouter()
  const initial = useMemo(() => new Set(defaults.length ? defaults : CATEGORIES.slice(0, 1).map((item) => item.id)), [defaults])
  const [selected, setSelected] = useState<Set<CategoryId>>(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  function toggle(category: CategoryId) {
    const next = new Set(selected)
    if (next.has(category)) next.delete(category)
    else next.add(category)
    setSelected(next)
  }

  async function confirm() {
    if (busy) return
    const categories = Array.from(selected)
    if (!categories.length) {
      setError("Select at least one category.")
      return
    }
    setBusy(true)
    setError("")
    try {
      await confirmTripCategories(sessionId, categories)
      router.push(`/new/recommendations?session=${sessionId}`)
      router.refresh()
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        window.location.href = "/signin?next=%2Fnew%2Fcategories&action=plan"
        return
      }
      setError(err instanceof Error ? err.message : "Category confirmation failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="mt-3 flex flex-wrap gap-2">
        {CATEGORIES.map((category) => {
          const active = selected.has(category.id)
          return (
            <button
              key={category.id}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(category.id)}
              className={
                active
                  ? "inline-flex items-center gap-2 rounded-full bg-primary px-3.5 py-2 text-[12.5px] font-medium text-primary-foreground"
                  : "inline-flex items-center gap-2 rounded-full bg-secondary px-3.5 py-2 text-[12.5px] font-medium text-foreground ring-1 ring-border hover:ring-primary/40"
              }
            >
              <CategoryIcon id={category.id} className={active ? "text-primary-foreground" : "text-primary"} />
              {category.label}
            </button>
          )
        })}
      </div>
      {error && <p className="mt-3 text-[12px] text-[color:var(--color-error)]">{error}</p>}
      <div className="mt-5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.push(`/new/review-images?session=${sessionId}`)}
          className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2.5 text-[13px] font-medium text-foreground ring-1 ring-border hover:bg-secondary"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Back
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={busy}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-[13.5px] font-medium text-primary-foreground hover:bg-[#0b2a25] disabled:cursor-not-allowed disabled:bg-secondary disabled:text-muted-foreground"
        >
          {busy ? "Building..." : "Build recommendations"}
          <ArrowRight className="size-3.5" aria-hidden />
        </button>
      </div>
    </>
  )
}
