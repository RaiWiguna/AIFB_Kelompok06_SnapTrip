import Link from "next/link"
import { SnapTripLogo } from "./snaptrip-logo"

const NAV = [
  {
    title: "Discover",
    links: [
      { label: "Explore", href: "/explore" },
      { label: "Pantai", href: "/explore?category=pantai" },
      { label: "Gunung", href: "/explore?category=gunung" },
      { label: "Air Terjun", href: "/explore?category=air_terjun" },
      { label: "Wisata Tradisional", href: "/explore?category=wisata_tradisional" },
    ],
  },
  {
    title: "Plan",
    links: [
      { label: "Start a trip", href: "/new" },
      { label: "Collections", href: "/collections" },
      { label: "Plan workspace", href: "/plan" },
      { label: "My trips", href: "/trips" },
    ],
  },
  {
    title: "About",
    links: [
      { label: "How it works", href: "/about" },
      { label: "Estimates & sources", href: "/about#estimates" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="relative border-t border-border/60 bg-background">
      <div className="mx-auto w-full max-w-[1480px] px-6 py-20 md:px-10 md:py-24">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <SnapTripLogo />
            <p className="mt-6 max-w-sm text-pretty text-[15px] leading-relaxed text-muted-foreground">
              SnapTrip turns saved trips and travel images into structured
              Indonesian travel plans. Discover, plan, and share with calm,
              honest details.
            </p>
            <div className="mt-8 flex items-center gap-3">
              <span className="stamp-frame rounded-md px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em]">
                Indonesia · Wonder awaits
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 md:col-span-7">
            {NAV.map((col) => (
              <div key={col.title}>
                <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {col.title}
                </div>
                <ul className="mt-5 space-y-3">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className="text-[15px] text-foreground/80 transition-colors hover:text-primary"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-3 border-t border-border/60 pt-6 text-[13px] text-muted-foreground md:flex-row md:items-center">
          <span>© {new Date().getFullYear()} SnapTrip — Crafted for Indonesian travelers.</span>
          <span className="font-mono text-[11px] uppercase tracking-[0.18em]">
            Plans stay private until you share.
          </span>
        </div>
      </div>
    </footer>
  )
}
