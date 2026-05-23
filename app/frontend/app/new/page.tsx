import Image from "next/image"
import Link from "next/link"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { ArrowRight, Bookmark, Heart, Lock, Sparkles, Upload } from "lucide-react"
import { AuthenticatedAppHeader } from "@/components/authenticated-app-header"
import { AppFooter } from "@/components/app-footer"
import { StepIndicator, NEW_TRIP_STEPS } from "@/components/step-indicator"
import { ApiError } from "@/lib/api/client"
import { getCollections } from "@/lib/api/collections"
import { getLikedTripPlans } from "@/lib/api/likes"
import { IMG } from "@/lib/data"

export default async function NewTripPage() {
  const cookieHeader = (await cookies()).toString()
  let liked
  let collections
  try {
    liked = (await getLikedTripPlans(cookieHeader)).slice(0, 4)
    collections = await getCollections(cookieHeader)
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect("/signin?next=%2Fnew&action=plan")
    }
    throw error
  }
  const collectionPreviews = collections.slice(0, 3)

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[420px] opacity-50">
        <Image
          src={IMG.heroLandscape || "/placeholder.svg"}
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-bottom"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background" />
      </div>

      <AuthenticatedAppHeader active="new" next="/new" action="plan" />

      <main className="mx-auto w-full max-w-[1280px] flex-1 px-6 pb-20 pt-6 md:px-10">
        <div className="mb-2 flex items-center gap-2 text-[12px] text-muted-foreground">
          <Link href="/" className="hover:text-primary">
            Home
          </Link>
          <span aria-hidden>/</span>
          <span className="text-foreground">Start a new trip</span>
        </div>

        <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Step 1 of 5</div>
            <h1 className="mt-3 font-display text-[clamp(2.4rem,4.4vw,3.6rem)] leading-[1.04] tracking-[-0.02em] text-primary text-balance">
              Choose images that
              <br /> represent your trip.
            </h1>
            <p className="mt-4 max-w-xl text-[14.5px] leading-relaxed text-foreground/75">
              SnapTrip reads up to eight images and turns them into a category profile. Upload new pictures or reuse the
              trips and places you&apos;ve already saved.
            </p>
          </div>
          <StepIndicator current={1} steps={NEW_TRIP_STEPS} />
        </div>

        {/* Three source options */}
        <section className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          <SourceCard
            href="/new/upload"
            icon={<Upload className="size-5" aria-hidden />}
            title="Upload images"
            description="JPG or PNG, 1–8 images, up to 8MB each."
            preview={
              <div className="grid grid-cols-3 gap-1.5">
                {[IMG.diamondBeach, IMG.bromoTengger, IMG.baliWomanTemple].map((src, i) => (
                  <div key={i} className="relative aspect-square overflow-hidden rounded-md ring-1 ring-black/5">
                    <Image src={src || "/placeholder.svg"} alt="" fill sizes="80px" className="object-cover" />
                  </div>
                ))}
              </div>
            }
            cta="Upload from device"
            primary
          />
          <SourceCard
            href="/new/likes"
            icon={<Heart className="size-5" aria-hidden />}
            title="From liked trips"
            description={`${liked.length} liked trips ready to seed your plan.`}
            preview={
              <div className="grid grid-cols-3 gap-1.5">
                {liked.slice(0, 3).map((t) => (
                  <div key={t.id} className="relative aspect-square overflow-hidden rounded-md ring-1 ring-black/5">
                    <Image src={t.cover || "/placeholder.svg"} alt="" fill sizes="80px" className="object-cover" unoptimized />
                  </div>
                ))}
              </div>
            }
            cta="Pick from likes"
          />
          <SourceCard
            href="/new/from-collections"
            icon={<Bookmark className="size-5" aria-hidden />}
            title="From a collection"
            description={`${collections.length} personal collections to draw from.`}
            preview={
              <div className="grid grid-cols-3 gap-1.5">
                {collectionPreviews.map((c) => (
                  <div key={c.slug} className="relative aspect-square overflow-hidden rounded-md ring-1 ring-black/5">
                    <Image src={c.cover || "/placeholder.svg"} alt="" fill sizes="80px" className="object-cover" unoptimized />
                  </div>
                ))}
              </div>
            }
            cta="Browse collections"
          />
        </section>

        {/* Why we ask + privacy */}
        <section className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Note
            icon={<Sparkles className="size-4" aria-hidden />}
            title="The classifier is assistive"
            body="You can confirm or correct the categories before recommendations are built."
          />
          <Note
            icon={<Lock className="size-4" aria-hidden />}
            title="Private by default"
            body="Uploaded images stay private until you publish or share."
          />
          <Note
            icon={<Sparkles className="size-4" aria-hidden />}
            title="Estimates labeled honestly"
            body="Costs and hours from recommendations are labeled as estimates."
          />
        </section>
      </main>

      <AppFooter />
    </div>
  )
}

function SourceCard({
  href,
  icon,
  title,
  description,
  preview,
  cta,
  primary,
}: {
  href: string
  icon: React.ReactNode
  title: string
  description: string
  preview: React.ReactNode
  cta: string
  primary?: boolean
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-3xl bg-card p-5 ring-1 ring-border transition hover:ring-primary/40 hover:shadow-[0_30px_70px_-30px_rgba(29,36,32,0.35)]"
    >
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary ring-1 ring-border">
          {icon}
        </span>
        <h3 className="font-display text-[22px] leading-tight tracking-tight text-primary">{title}</h3>
      </div>
      <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">{description}</p>
      <div className="mt-5">{preview}</div>
      <span
        className={
          primary
            ? "mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-[13.5px] font-medium text-primary-foreground group-hover:bg-[#0b2a25]"
            : "mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-secondary px-4 py-2.5 text-[13.5px] font-medium text-foreground ring-1 ring-border group-hover:ring-primary/40"
        }
      >
        {cta}
        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </span>
    </Link>
  )
}

function Note({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-card p-4 ring-1 ring-border">
      <span className="grid size-8 place-items-center rounded-lg bg-secondary text-primary">{icon}</span>
      <div>
        <p className="text-[13.5px] font-medium text-foreground">{title}</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </div>
  )
}
