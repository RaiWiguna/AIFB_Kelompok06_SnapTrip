"use client"

import { useRouter } from "next/navigation"
import { Heart } from "lucide-react"
import { likeTripPlan, unlikeTripPlan } from "@/lib/api/likes"
import { cn } from "@/lib/utils"

export function TripCardLikeButton({
  tripId,
  liked,
  authHref,
}: {
  tripId: string
  liked?: boolean
  authHref?: string
}) {
  const router = useRouter()

  async function onClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()
    if (authHref) {
      router.push(authHref)
      return
    }
    if (liked) {
      await unlikeTripPlan(tripId)
    } else {
      await likeTripPlan(tripId)
    }
    router.refresh()
  }

  return (
    <button
      type="button"
      aria-label={liked ? "Unlike trip" : "Like trip"}
      onClick={onClick}
      className={cn(
        "grid size-8 place-items-center rounded-full backdrop-blur-md transition",
        liked ? "bg-accent text-accent-foreground" : "bg-white/85 text-foreground hover:bg-white",
      )}
    >
      <Heart className={cn("size-4", liked && "fill-current")} aria-hidden />
    </button>
  )
}

