import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Compass, Layers, Lock, Sparkles } from "lucide-react"
import { AppHeader } from "@/components/app-header"
import { AppFooter } from "@/components/app-footer"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { IMG } from "@/lib/data"

export default async function AboutPage({
  searchParams,
}: {
  searchParams: Promise<{ as?: string }>
}) {
  const { as } = await searchParams
  const isAuthed = as === "user"
  const planHref = isAuthed ? "/new" : "/signin?next=%2Fnew&action=plan"
  const exploreHref = isAuthed ? "/explore?as=user" : "/explore"

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {isAuthed ? <AppHeader /> : <SiteHeader active="about" />}
      <main className="mx-auto w-full max-w-[1480px] flex-1 px-6 pb-24 pt-6 md:px-10">
        <section className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">About SnapTrip</div>
            <h1 className="mt-5 font-display text-[clamp(2.6rem,4.4vw,4rem)] leading-[1.03] tracking-[-0.02em] text-primary text-balance">
              Travel inspiration, finally turned into a plan.
            </h1>
            <p className="mt-6 max-w-xl text-[15.5px] leading-relaxed text-foreground/75">
              SnapTrip is a quiet, editorial planner for trips across Indonesia. It begins with the screenshots and
              saves you already collect, and gently turns them into a structured itinerary, with budget notes and local
              recommendations that respect the place you&apos;re visiting.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={planHref}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-[14px] font-medium text-primary-foreground hover:bg-[#0b2a25]"
              >
                Start planning
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                href={exploreHref}
                className="inline-flex items-center gap-2 rounded-2xl bg-card px-5 py-3 text-[14px] font-medium text-foreground ring-1 ring-border hover:bg-secondary"
              >
                <Compass className="size-4" aria-hidden />
                Browse Explore
              </Link>
            </div>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl ring-1 ring-black/5">
            <Image src={IMG.baliCoastalPano || "/placeholder.svg"} alt="Indonesian coastline" fill sizes="50vw" className="object-cover" />
          </div>
        </section>

        <section className="mt-20 grid grid-cols-1 gap-5 md:grid-cols-3">
          {[
            {
              icon: <Layers className="size-4" aria-hidden />,
              title: "Structured plans",
              note: "Days, destinations, transport, meals — laid out clearly so you can adjust with intent.",
            },
            {
              icon: <Sparkles className="size-4" aria-hidden />,
              title: "Recommendations that match",
              note: "Suggestions are tied to your saved images, your pace, and the season you&apos;re traveling.",
            },
            {
              icon: <Lock className="size-4" aria-hidden />,
              title: "Private by default",
              note: "Your trips stay private until you choose to invite collaborators or publish to Explore.",
            },
          ].map((f) => (
            <div key={f.title} className="rounded-3xl bg-card p-6 ring-1 ring-border/70">
              <span className="grid size-9 place-items-center rounded-xl bg-secondary text-primary">{f.icon}</span>
              <h3 className="mt-4 font-display text-[22px] leading-tight text-foreground">{f.title}</h3>
              <p
                className="mt-2 text-[13.5px] leading-relaxed text-foreground/70"
                dangerouslySetInnerHTML={{ __html: f.note }}
              />
            </div>
          ))}
        </section>
      </main>
      {isAuthed ? <AppFooter /> : <SiteFooter />}
    </div>
  )
}
