import Image from "next/image"
import {
  ArrowRight,
  Bookmark,
  ChevronRight,
  Copy,
  Globe,
  Heart,
  Lock,
  Plus,
  ShieldCheck,
  Users,
} from "lucide-react"
import { IMG } from "@/lib/data"
import { LandingSection, Reveal, Stagger, StaggerItem } from "@/components/landing/landing-motion"

export function ShareSection() {
  return (
    <LandingSection className="relative overflow-hidden bg-background py-16 md:flex md:min-h-[125svh] md:items-center md:py-6">
      <div className="absolute bottom-12 left-12 z-0 hidden md:block">
        <div className="stamp-frame rotate-[-8deg] rounded-md px-3 py-2 font-mono text-[10px] uppercase tracking-[0.22em]">
          Indonesia · Wonder awaits
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-[1280px] px-6 md:px-10">
        {/* Step indicator */}
        <Reveal className="flex flex-col items-center text-center">
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">
            6 of 7
          </div>
          <div
            aria-hidden
            className="mt-1 h-px w-12 bg-accent/60"
          />
          <h2 className="mt-6 font-display text-[clamp(2.4rem,4.5vw,4rem)] leading-[1.02] tracking-[-0.01em] text-primary">
            Share on your terms.
          </h2>
          <p className="mt-5 max-w-2xl text-[15.5px] leading-relaxed text-muted-foreground">
            Keep a trip private, invite participants, or publish it back to
            Explore.
          </p>
        </Reveal>

        {/* Three cards */}
        <Stagger className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Private */}
          <StaggerItem className="h-full">
          <ShareCard
            icon={<Lock className="size-5" aria-hidden />}
            title="Private"
            note="Keep your itinerary private. Only you can see it."
            cover={IMG.diamondBeach}
          >
            <div className="rounded-2xl bg-card/95 p-3.5 ring-1 ring-border/70">
              <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-[12px] font-medium text-foreground/80 ring-1 ring-border/70">
                <Lock className="size-3.5 text-foreground/60" aria-hidden />
                <span>This trip is private</span>
                <span className="text-muted-foreground">· Visible only to you</span>
              </div>
            </div>
          </ShareCard>
          </StaggerItem>

          {/* Invite */}
          <StaggerItem className="h-full">
          <ShareCard
            icon={<Users className="size-5" aria-hidden />}
            title="Invite participants"
            note="Invite others to view and collaborate on the plan with you."
            cover={IMG.baliCoastalPano}
          >
            <div className="rounded-2xl bg-card p-3.5 ring-1 ring-border/70">
              <div className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-[12px] text-foreground">
                <span className="font-mono text-foreground/80">
                  https://snaptrip.com/trip/bali-aug2025
                </span>
                <Copy className="ml-auto size-3.5 text-muted-foreground" aria-hidden />
              </div>
              <div className="mt-2 flex items-center justify-between rounded-lg px-1 py-1.5 text-[12px] text-muted-foreground">
                <span>Anyone with the link can view</span>
                <ChevronRight className="size-3.5" aria-hidden />
              </div>
              <ul className="mt-2 space-y-2">
                <Participant name="You" role="Trip creator" />
                <Participant name="Alex" role="Can edit" />
                <Participant name="Maya" role="Can comment" />
              </ul>
              <button className="mt-3 inline-flex w-full items-center gap-2 rounded-lg bg-card px-3 py-2 text-[12.5px] font-medium text-foreground ring-1 ring-border transition hover:bg-secondary active:translate-y-px">
                <Plus className="size-3.5" aria-hidden />
                Invite more people
              </button>
            </div>
          </ShareCard>
          </StaggerItem>

          {/* Publish */}
          <StaggerItem className="h-full">
          <ShareCard
            icon={<Globe className="size-5" aria-hidden />}
            title="Publish to Explore"
            note="Inspire others by sharing your trip with the SnapTrip community."
            cover={IMG.baliWomanTemple}
          >
            <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-border/70">
              <div className="relative aspect-[16/9]">
                <Image src={IMG.baliWomanTemple || "/placeholder.svg"} alt="" fill sizes="320px" className="object-cover" />
                <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-mist/95 px-2.5 py-1 text-[11px] font-medium text-canopy">
                  Published
                </span>
                <span className="absolute right-3 top-3 grid size-7 place-items-center rounded-full bg-mist/95">
                  <Bookmark className="size-3.5 text-canopy" aria-hidden />
                </span>
              </div>
              <div className="p-3.5">
                <div className="font-display text-[18px] text-foreground">
                  Bali & Nusa Penida
                </div>
                <div className="text-[12px] text-muted-foreground">
                  6 days · 2–8 Aug 2025
                </div>
                <div className="mt-2 flex items-center justify-between text-[12px] text-foreground/80">
                  <span className="inline-flex items-center gap-1.5">
                    <Heart className="size-3.5 fill-accent text-accent" aria-hidden />
                    342
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Bookmark className="size-3.5 text-foreground/70" aria-hidden />
                    128
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    By you
                    <span className="size-4 rounded-full bg-secondary" />
                  </span>
                </div>
              </div>
            </div>
          </ShareCard>
          </StaggerItem>
        </Stagger>

        {/* Footer note */}
        <div className="mt-5 flex items-center justify-center">
          <div className="inline-flex items-center gap-2.5 rounded-full bg-card px-4 py-2.5 ring-1 ring-border/70">
            <ShieldCheck className="size-4 text-success" aria-hidden />
            <span className="text-[13.5px] text-foreground">
              Private trips stay private by default.
            </span>
            <span className="text-[12.5px] text-muted-foreground">
              They’ll only be visible if you invite someone or publish to Explore.
            </span>
          </div>
        </div>
      </div>
    </LandingSection>
  )
}

function ShareCard({
  icon,
  title,
  note,
  cover,
  children,
}: {
  icon: React.ReactNode
  title: string
  note: string
  cover: string
  children: React.ReactNode
}) {
  return (
    <div className="group relative flex h-full min-h-[560px] overflow-hidden rounded-[28px] ring-1 ring-border/60 transition duration-700 hover:-translate-y-1">
      <Image
        src={cover || "/placeholder.svg"}
        alt=""
        aria-hidden
        fill
        sizes="(max-width: 768px) 100vw, 33vw"
        className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-mist/85 via-mist/65 to-mist/85"
      />
      <div className="relative flex h-full w-full flex-col items-center px-5 py-4">
        <span className="grid size-12 place-items-center rounded-full bg-card text-foreground ring-1 ring-border/60">
          {icon}
        </span>
        <h3 className="mt-3 font-display text-[24px] text-primary">{title}</h3>
        <p className="mt-1.5 max-w-[260px] text-center text-[13px] leading-relaxed text-muted-foreground">
          {note}
        </p>
        <div
          aria-hidden
          className="my-3 inline-flex items-center gap-2 text-muted-foreground"
        >
          <span className="h-px w-10 border-t border-dashed border-border/80" />
          <ArrowRight className="size-3.5" />
          <span className="h-px w-10 border-t border-dashed border-border/80" />
        </div>
        <div className="w-full">{children}</div>
      </div>
    </div>
  )
}

function Participant({ name, role }: { name: string; role: string }) {
  return (
    <li className="flex items-center gap-2.5 px-1 py-1">
      <span className="grid size-7 place-items-center rounded-full bg-secondary">
        <span className="size-5 rounded-full bg-soft-accent/60" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-medium text-foreground">{name}</div>
        <div className="text-[11px] text-muted-foreground">{role}</div>
      </div>
      <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden />
    </li>
  )
}
