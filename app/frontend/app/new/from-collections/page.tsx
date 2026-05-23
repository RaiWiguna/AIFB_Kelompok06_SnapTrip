import Image from "next/image"
import Link from "next/link"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { ArrowLeft, ArrowRight, Bookmark } from "lucide-react"
import { AppHeader } from "@/components/app-header"
import { AppFooter } from "@/components/app-footer"
import { StepIndicator, NEW_TRIP_STEPS } from "@/components/step-indicator"
import { ApiError } from "@/lib/api/client"
import { getCollections } from "@/lib/api/collections"

export default async function NewFromCollectionsPage() {
  const cookieHeader = (await cookies()).toString()
  let collections
  try {
    collections = await getCollections(cookieHeader)
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect("/signin?next=%2Fnew%2Ffrom-collections&action=plan")
    }
    throw error
  }
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
          <span className="text-foreground">From collections</span>
        </div>

        <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Step 1 · From collection</div>
            <h1 className="mt-3 font-display text-[clamp(2rem,3.6vw,3rem)] leading-[1.04] tracking-[-0.02em] text-primary text-balance">
              Reuse a saved set
              <br /> as inspiration.
            </h1>
            <p className="mt-3 max-w-xl text-[14.5px] leading-relaxed text-foreground/75">
              Open a collection to pick the covers that should drive your new trip&apos;s category profile.
            </p>
          </div>
          <StepIndicator current={1} steps={NEW_TRIP_STEPS} />
        </div>

        <ul className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {collections.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/collections/${c.slug}?select=1`}
                className="group block overflow-hidden rounded-3xl bg-card ring-1 ring-border transition hover:ring-primary/40"
              >
                <div className="grid grid-cols-2 gap-1 p-2">
                  {c.covers.slice(0, 4).map((src, i) => (
                    <div key={i} className="relative aspect-[5/4] overflow-hidden rounded-xl ring-1 ring-black/5">
                      <Image src={src || "/placeholder.svg"} alt="" fill sizes="200px" className="object-cover" unoptimized />
                    </div>
                  ))}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-[20px] leading-tight tracking-tight text-primary">{c.name}</h3>
                    <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
                      <Bookmark className="size-3.5" aria-hidden />
                      {c.count}
                    </span>
                  </div>
                  <p className="mt-1 text-[12.5px] text-muted-foreground">{c.description}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-primary group-hover:underline">
                    Open collection
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex items-center justify-between gap-4 rounded-3xl bg-card p-4 ring-1 ring-border">
          <p className="text-[13px] text-muted-foreground">
            Open any collection to choose covers, or go back to upload fresh images.
          </p>
          <Link
            href="/new"
            className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2.5 text-[13px] font-medium text-foreground ring-1 ring-border hover:bg-secondary"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Back to source picker
          </Link>
        </div>
      </main>
      <AppFooter />
    </div>
  )
}
