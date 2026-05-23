"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Bookmark, Plus } from "lucide-react"
import {
  createCollection,
  getCollections,
  saveTripToCollection,
} from "@/lib/api/collections"
import type { CollectionCardDisplay } from "@/lib/api/types"
import { cn } from "@/lib/utils"

export function TripCardSaveButton({
  tripId,
  saved,
  authHref,
}: {
  tripId: string
  saved?: boolean
  authHref?: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [collections, setCollections] = useState<CollectionCardDisplay[]>([])
  const [name, setName] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    async function loadCollections() {
      if (!open || authHref) return
      setError("")
      try {
        const items = await getCollections()
        if (!cancelled) setCollections(items)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load collections")
      }
    }
    loadCollections()
    return () => {
      cancelled = true
    }
  }, [authHref, open])

  function openPanel(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()
    if (authHref) {
      router.push(authHref)
      return
    }
    setOpen((current) => !current)
  }

  async function save(collectionId: string) {
    setBusy(true)
    setError("")
    try {
      await saveTripToCollection(collectionId, tripId)
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this trip")
    } finally {
      setBusy(false)
    }
  }

  async function createAndSave(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()
    const trimmed = name.trim()
    if (!trimmed) return
    setBusy(true)
    setError("")
    try {
      const collection = await createCollection(trimmed)
      await saveTripToCollection(collection.id, tripId)
      setName("")
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create collection")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={saved ? "Saved to collection" : "Save to collection"}
        onClick={openPanel}
        className={cn(
          "grid size-8 place-items-center rounded-full backdrop-blur-md transition",
          saved ? "bg-primary text-primary-foreground" : "bg-white/85 text-foreground hover:bg-white",
        )}
      >
        <Bookmark className={cn("size-4", saved && "fill-current")} aria-hidden />
      </button>

      {open && (
        <div
          className="absolute right-0 top-10 z-20 w-64 rounded-2xl bg-card p-3 text-foreground shadow-[0_18px_60px_-24px_rgba(29,36,32,0.5)] ring-1 ring-border"
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
          }}
        >
          <p className="text-[12.5px] font-medium text-foreground">Save to collection</p>
          <div className="mt-2 max-h-36 space-y-1 overflow-auto">
            {collections.map((collection) => (
              <button
                key={collection.id}
                type="button"
                disabled={busy}
                onClick={() => save(collection.id)}
                className="flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-[12.5px] hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-70"
              >
                <span className="truncate">{collection.name}</span>
                <span className="text-[11px] text-muted-foreground">{collection.count}</span>
              </button>
            ))}
            {!collections.length && (
              <p className="rounded-xl bg-secondary px-2.5 py-2 text-[12px] text-muted-foreground">
                No collections yet.
              </p>
            )}
          </div>
          <div className="mt-2 flex gap-1.5">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="New collection"
              aria-label="New collection name"
              className="min-w-0 flex-1 rounded-xl bg-secondary px-2.5 py-2 text-[12.5px] outline-none ring-1 ring-border focus:ring-primary"
            />
            <button
              type="button"
              disabled={busy || !name.trim()}
              aria-label="Create collection and save"
              onClick={createAndSave}
              className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground disabled:cursor-not-allowed disabled:bg-secondary disabled:text-muted-foreground"
            >
              <Plus className="size-3.5" aria-hidden />
            </button>
          </div>
          {error && <p className="mt-2 text-[11.5px] text-[color:var(--color-error)]">{error}</p>}
        </div>
      )}
    </div>
  )
}
