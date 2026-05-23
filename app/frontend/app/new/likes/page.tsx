import Image from "next/image"
import Link from "next/link"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { ArrowLeft, Heart } from "lucide-react"
import { AuthenticatedAppHeader } from "@/components/authenticated-app-header"
import { AppFooter } from "@/components/app-footer"
import { SourceImagesContinueButton } from "@/components/source-images-continue-button"
import { StepIndicator, NEW_TRIP_STEPS } from "@/components/step-indicator"
import { ApiError } from "@/lib/api/client"
import { getLikedTripPlans } from "@/lib/api/likes"

export default async function NewFromLikesPage() {
  const cookieHeader = (await cookies()).toString()
  let liked
  try {
    liked = await getLikedTripPlans(cookieHeader)
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect("/signin?next=%2Fnew%2Flikes&action=plan")
    }
    throw error
  }
  const usableImageIds = liked.map((trip) => trip.sourceImageId).filter((id): id is string => Boolean(id)).slice(0, 8)

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AuthenticatedAppHeader active="new" next="/new/likes" action="plan" />
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
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Step 1 - From likes</div>
            <h1 className="mt-3 font-display text-[clamp(2rem,3.6vw,3rem)] leading-[1.04] tracking-[-0.02em] text-primary text-balance">
              Pick from trips
              <br /> you&apos;ve liked.
            </h1>
            <p className="mt-3 max-w-xl text-[14.5px] leading-relaxed text-foreground/75">
              Up to 8 backend-owned covers can seed your new trip. Static fallback covers stay display-only.
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
                href="/explore?as=user"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-[13px] font-medium text-primary-foreground hover:bg-[#0b2a25]"
              >
                Open Explore
              </Link>
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {liked.map((trip) => {
                const selected = Boolean(trip.sourceImageId && usableImageIds.includes(trip.sourceImageId))
                return (
                  <li
                    key={trip.id}
                    className={
                      selected
                        ? "relative overflow-hidden rounded-2xl bg-card ring-2 ring-primary"
                        : "relative overflow-hidden rounded-2xl bg-card ring-1 ring-border hover:ring-primary/40"
                    }
                  >
                    <div className="relative aspect-[4/3]">
                      <Image src={trip.cover || "/placeholder.svg"} alt="" fill sizes="33vw" className="object-cover" unoptimized />
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
                      <p className="truncate font-display text-[15px] text-primary">{trip.title}</p>
                      <p className="truncate text-[11.5px] text-muted-foreground">{trip.region}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <div className="mt-8 flex items-center justify-between gap-4 rounded-3xl bg-card p-4 ring-1 ring-border">
          <p className="text-[13px] text-muted-foreground">
            <span className="font-medium text-foreground">{usableImageIds.length} of {Math.min(liked.length, 8)}</span>{" "}
            selected - max 8 backend-owned images.
          </p>
          <div className="flex items-center gap-2">
            <Link
              href="/new"
              className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2.5 text-[13px] font-medium text-foreground ring-1 ring-border hover:bg-secondary"
            >
              <ArrowLeft className="size-3.5" aria-hidden />
              Back
            </Link>
            <SourceImagesContinueButton source="liked_trips" imageIds={usableImageIds} />
          </div>
        </div>
      </main>
      <AppFooter />
    </div>
  )
}
