import Link from "next/link"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { Heart } from "lucide-react"
import { AppHeader } from "@/components/app-header"
import { AppFooter } from "@/components/app-footer"
import { TripCard } from "@/components/trip-card"
import { ApiError } from "@/lib/api/client"
import { getLikedTripPlans } from "@/lib/api/likes"

export default async function LikedTripsPage() {
  const cookieHeader = (await cookies()).toString()
  let liked
  try {
    liked = await getLikedTripPlans(cookieHeader)
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect("/signin?next=%2Flikes&action=like")
    }
    throw error
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader />
      <main className="mx-auto w-full max-w-[1480px] flex-1 px-6 py-10 md:px-10">
        <div className="mb-2 flex items-center gap-2 text-[12px] text-muted-foreground">
          <Link href="/" className="hover:text-primary">
            Home
          </Link>
          <span aria-hidden>/</span>
          <span className="text-foreground">Liked trips</span>
        </div>

        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Saved sparks</div>
            <h1 className="mt-3 font-display text-[44px] leading-[1.04] tracking-[-0.02em] text-primary">
              Trips you&apos;ve liked.
            </h1>
            <p className="mt-3 max-w-xl text-[14.5px] leading-relaxed text-foreground/75">
              Keep track of the inspiration that caught your eye. Pull from these directly when you start a new trip.
            </p>
          </div>
          <Link
            href="/new"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-[14px] font-medium text-primary-foreground hover:bg-[#0b2a25]"
          >
            <Heart className="size-4 fill-current" aria-hidden />
            Use likes as inspiration
          </Link>
        </div>

        {liked.length === 0 ? (
          <div className="mt-10 rounded-3xl bg-secondary/40 p-12 text-center ring-1 ring-border">
            <p className="font-display text-[24px] text-primary">No likes yet.</p>
            <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-muted-foreground">
              Browse Explore and tap the heart on plans you find inspiring.
            </p>
            <Link
              href="/explore"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-[13px] font-medium text-primary-foreground hover:bg-[#0b2a25]"
            >
              Open Explore
            </Link>
          </div>
        ) : (
          <ul className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {liked.map((t) => (
              <li key={t.id}>
                <TripCard trip={{ ...t, liked: true }} />
              </li>
            ))}
          </ul>
        )}
      </main>
      <AppFooter />
    </div>
  )
}
