import Image from "next/image"
import { Bookmark, Clock, Compass, Leaf, Lightbulb, MapPin, ShieldCheck, Sparkles, Sun, Wallet } from "lucide-react"
import { IMG, RECOMMENDATIONS } from "@/lib/data"
import { LandingSection, Reveal, Stagger, StaggerItem } from "@/components/landing/landing-motion"

export function RecommendationsSection() {
  return (
    <LandingSection className="relative overflow-hidden bg-[#1a1f1d] py-16 text-mist md:flex md:min-h-[125svh] md:items-center md:py-10">
      <div className="relative mx-auto grid w-full max-w-[1480px] grid-cols-1 gap-8 px-6 md:grid-cols-12 md:items-center md:px-10">
        {/* Left: title + how it works */}
        <Reveal className="md:col-span-4" direction="right">
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-soft-accent">
            Section 4 of 7
          </div>
          <h2 className="mt-5 font-display text-[clamp(2.2rem,4vw,3.6rem)] leading-[1.05] tracking-[-0.01em] text-mist">
            See destinations
            <br />
            that match your trip.
          </h2>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-sage">
            Review destination options with hours, budget estimates, location
            context, and match reasons before you start planning.
          </p>

          {/* How recommendations work */}
          <Reveal className="mt-7 rounded-2xl bg-canopy/70 p-5 ring-1 ring-dark-line" delay={0.1}>
            <div className="text-[13.5px] font-medium text-mist">
              How recommendations work
            </div>
            <ul className="mt-4 space-y-3.5">
              <Bullet icon={<Compass className="size-4" aria-hidden />}>
                Based on your trip dates, interests, and preferred pace.
              </Bullet>
              <Bullet icon={<MapPin className="size-4" aria-hidden />}>
                We factor in travel time, season, and local conditions.
              </Bullet>
              <Bullet icon={<ShieldCheck className="size-4" aria-hidden />}>
                Every pick includes match confidence and why it fits.
              </Bullet>
            </ul>
          </Reveal>

          <button className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-soft-accent px-5 py-3 text-[14.5px] font-medium text-canopy transition hover:bg-[#f5c2a4]">
            <Sparkles className="size-4" aria-hidden />
            Review destinations
          </button>
        </Reveal>

        {/* Right: trip header + cards */}
        <Reveal className="md:col-span-8" direction="left" delay={0.08}>
          <div className="mb-4 inline-flex items-center gap-3 rounded-2xl bg-night/80 px-4 py-3 ring-1 ring-dark-line">
            <Sun className="size-4 text-soft-accent" aria-hidden />
            <div>
              <div className="text-[13.5px] font-medium text-mist">
                Recommendations for your trip
              </div>
              <div className="text-[12.5px] text-sage">
                Bali · 6 days · 2–8 Aug 2026
              </div>
            </div>
          </div>

          <Stagger className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {RECOMMENDATIONS.map((r) => (
              <StaggerItem
                key={r.name}
                className="group overflow-hidden rounded-[18px] bg-canopy/80 ring-1 ring-dark-line transition duration-700 hover:-translate-y-1"
              >
                <div className="relative aspect-[5/4] lg:aspect-[4/3]">
                  <Image
                    src={r.cover || "/placeholder.svg"}
                    alt={r.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 25vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                  />
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-t from-canopy/70 to-transparent"
                  />
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-mist/95 px-2.5 py-1 text-[11.5px] font-medium text-canopy">
                    <Sparkles className="size-3 text-accent" aria-hidden />
                    {r.match}% match
                  </span>
                </div>
                <div className="p-3.5">
                  <h3 className="font-display text-[22px] leading-tight text-mist">
                    {r.name}
                  </h3>
                  <div className="mt-1 text-[12.5px] text-sage">
                    {r.category} · {r.subCategory}
                  </div>

                  <ul className="mt-3 space-y-2">
                    <Meta icon={<Clock className="size-3.5" aria-hidden />} label="Est. time" value={r.estTime} />
                    <Meta icon={<Wallet className="size-3.5" aria-hidden />} label="Est. budget" value={r.estBudget} />
                    <Meta icon={<MapPin className="size-3.5" aria-hidden />} label="Region" value={r.region} />
                  </ul>
                </div>

                <div className="border-t border-dark-line bg-night/60 p-3.5">
                  <div className="inline-flex items-center gap-1.5 text-[12px] font-medium text-success">
                    <Leaf className="size-3.5" aria-hidden />
                    Why it’s a match
                  </div>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-sage">
                    {r.reason}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-canopy/70 px-4 py-2 text-[12.5px] text-sage ring-1 ring-dark-line">
            <Lightbulb className="size-3.5 text-soft-accent" aria-hidden />
            Tip: You can fine-tune these picks in the next step.
            <Bookmark className="size-3.5 text-sage/70" aria-hidden />
          </div>
        </Reveal>
      </div>
    </LandingSection>
  )
}

function Bullet({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-[13px] leading-relaxed text-sage">
      <span className="grid size-7 place-items-center rounded-full bg-night/80 text-soft-accent ring-1 ring-dark-line">
        {icon}
      </span>
      <span className="flex-1 pt-0.5">{children}</span>
    </li>
  )
}

function Meta({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 grid size-6 place-items-center rounded-md bg-night/70 text-sage ring-1 ring-dark-line">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[11.5px] uppercase tracking-wider text-sage/70">
          {label}
        </div>
        <div className="text-[13px] leading-snug text-mist">{value}</div>
      </div>
    </li>
  )
}
