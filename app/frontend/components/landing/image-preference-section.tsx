import Image from "next/image"
import Link from "next/link"
import { ArrowRight, CheckCircle2, ListChecks, Lock, Sparkles, Upload } from "lucide-react"
import { CategoryIcon } from "@/components/category-icon"
import { IMG, PREFERENCE_RESULT } from "@/lib/data"
import { Float, LandingSection, Reveal, Stagger, StaggerItem } from "@/components/landing/landing-motion"

const STAMP_CARDS: { src: string; label: string; cat: "pantai" | "gunung" | "air_terjun" | "wisata_tradisional"; rotate: string; pos: string; size: string }[] = [
  {
    src: IMG.diamondBeach,
    label: "Pantai",
    cat: "pantai",
    rotate: "-rotate-[6deg]",
    pos: "top-0 left-0",
    size: "w-[300px] h-[210px]",
  },
  {
    src: IMG.bromoTengger,
    label: "Gunung",
    cat: "gunung",
    rotate: "rotate-[5deg]",
    pos: "top-2 right-2",
    size: "w-[280px] h-[200px]",
  },
  {
    src: IMG.baliWomanTemple,
    label: "Wisata Tradisional",
    cat: "wisata_tradisional",
    rotate: "-rotate-[3deg]",
    pos: "top-[180px] left-[30px]",
    size: "w-[260px] h-[180px]",
  },
  {
    src: IMG.baliCoastalPano,
    label: "Air Terjun",
    cat: "air_terjun",
    rotate: "rotate-[2deg]",
    pos: "top-[210px] right-[40px]",
    size: "w-[240px] h-[200px]",
  },
]

export function ImagePreferenceSection() {
  return (
    <LandingSection className="relative overflow-hidden bg-background py-16 md:flex md:min-h-[125svh] md:items-center md:py-10">
      <div className="relative mx-auto grid w-full max-w-[1480px] grid-cols-1 gap-8 px-6 md:grid-cols-12 md:items-center md:gap-10 md:px-10">
        {/* Left: copy */}
        <Reveal className="md:col-span-4 md:pt-6" direction="right">
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">
            3 / 7
          </div>
          <div className="mt-2 font-mono text-[11px] uppercase tracking-[0.22em] text-accent">
            Image-to-preference
          </div>
          <h2 className="mt-6 font-display text-[clamp(2.2rem,4vw,3.8rem)] leading-[1.02] tracking-[-0.01em] text-primary">
            Use images
            <br />
            to point the way.
          </h2>
          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            Use up to eight images to point SnapTrip toward the kind of trip
            you want. Upload new images or reuse the trips and places you
            already saved.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/signin?next=%2Fnew%2Fupload&action=plan"
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-[14.5px] font-medium text-primary-foreground transition hover:bg-[#0b2a25]"
            >
              <Upload className="size-4" aria-hidden />
              Upload
            </Link>
            <Link
              href="/collections"
              className="inline-flex items-center gap-2 rounded-2xl bg-card px-5 py-3 text-[14.5px] font-medium text-foreground ring-1 ring-border hover:bg-secondary"
            >
              <ListChecks className="size-4" aria-hidden />
              Reuse saved images
            </Link>
          </div>

          <div className="mt-3.5">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-2xl bg-card px-5 py-3 text-[14.5px] font-medium text-foreground ring-1 ring-border hover:bg-secondary"
            >
              <CheckCircle2 className="size-4" aria-hidden />
              Confirm categories
            </button>
          </div>

          <div className="mt-8 inline-flex items-start gap-3 rounded-2xl bg-card/80 px-4 py-3 ring-1 ring-border/70 backdrop-blur-sm">
            <Lock className="mt-0.5 size-4 text-foreground/70" aria-hidden />
            <div>
              <div className="text-[13.5px] font-medium text-foreground">
                Private by default
              </div>
              <div className="text-[12.5px] text-muted-foreground">
                Your images stay private until you share.
              </div>
            </div>
          </div>
        </Reveal>

        {/* Center: photo collage */}
        <Reveal className="md:col-span-5" delay={0.08}>
          <div className="relative mx-auto h-[430px] w-full max-w-[600px]">
            {STAMP_CARDS.map((c) => (
              <Float
                key={c.label}
                className={`absolute ${c.pos} ${c.rotate} ${c.size}`}
                amplitude={c.cat === "pantai" ? 8 : 6}
                duration={c.cat === "gunung" ? 8.4 : 7.2}
              >
                <div className="relative h-full w-full overflow-hidden rounded-[18px] bg-card p-2 shadow-[0_28px_60px_-30px_rgba(29,36,32,0.45)] ring-1 ring-black/10">
                  <div className="relative h-full w-full overflow-hidden rounded-[12px]">
                    <Image
                      src={c.src || "/placeholder.svg"}
                      alt={c.label}
                      fill
                      sizes="320px"
                      className="object-cover"
                    />
                  </div>
                  {/* Polaroid-like label */}
                  <span className="absolute -top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-[11.5px] font-medium text-foreground shadow-sm ring-1 ring-black/5">
                    <CategoryIcon id={c.cat} size={13} />
                    {c.label}
                  </span>
                </div>
              </Float>
            ))}

            {/* Bottom thumbnail strip */}
            <div className="absolute bottom-[-10px] left-1/2 flex -translate-x-1/2 items-center gap-2.5">
              {[IMG.baliGateSunset, IMG.baliCoastalPano, IMG.diamondBeach, IMG.baliWomanTemple].map(
                (src, i) => (
                  <div
                    key={i}
                    className="relative size-16 overflow-hidden rounded-[10px] ring-1 ring-black/10"
                  >
                    <Image src={src || "/placeholder.svg"} alt="" fill sizes="64px" className="object-cover" />
                  </div>
                ),
              )}
            </div>

            {/* Analyzing caption */}
            <div className="pointer-events-none absolute -bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap font-display italic text-[15px] text-foreground/65">
              <Sparkles className="mr-1.5 -mt-0.5 inline size-4 text-accent" aria-hidden />
              Analyzing your images...
            </div>
          </div>
        </Reveal>

        {/* Right: preferences detected */}
        <Reveal className="md:col-span-3" direction="left" delay={0.14}>
          <div className="rounded-[22px] bg-card p-5 shadow-[0_24px_60px_-30px_rgba(29,36,32,0.35)] ring-1 ring-border/70">
            <div className="flex items-center gap-2">
              <span className="text-[14.5px] font-medium text-foreground">
                Your trip preferences
              </span>
              <Sparkles className="size-3.5 text-accent" aria-hidden />
            </div>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">
              Detected from your images
            </p>

            <Stagger className="mt-5 space-y-3.5">
              {PREFERENCE_RESULT.scores.map((s) => (
                <StaggerItem key={s.id} className="flex items-center gap-3">
                  <span className="grid size-8 place-items-center rounded-md bg-secondary text-primary">
                    <CategoryIcon id={s.id} size={16} />
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[13.5px] font-medium text-foreground">
                        {s.label}
                      </span>
                      <span className="font-mono text-[11.5px] text-muted-foreground">
                        {s.value}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${s.value}%` }}
                      />
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>

            <div className="mt-6 border-t border-border/60 pt-4">
              <div className="text-[13.5px] font-medium text-foreground">
                Trip vibe
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {PREFERENCE_RESULT.vibes.map((v) => (
                  <span
                    key={v}
                    className="rounded-full bg-secondary px-2.5 py-1 text-[12px] text-foreground/85"
                  >
                    {v}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-secondary/80 p-3 text-[12.5px] leading-relaxed text-foreground/85">
              <Sparkles className="mr-1 -mt-0.5 inline size-3.5 text-accent" aria-hidden />
              We’ll use these preferences to shape your recommended trip.
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end">
            <Link
              href="/new"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-primary"
            >
              See how it works
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        </Reveal>
      </div>
    </LandingSection>
  )
}
