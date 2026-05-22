import Image from "next/image"
import Link from "next/link"
import { Bookmark, Compass, Heart, LogOut, Settings, Shield } from "lucide-react"
import { AppHeader } from "@/components/app-header"
import { AppFooter } from "@/components/app-footer"
import { CURRENT_USER, MY_TRIPS, JOINED_TRIPS, COLLECTIONS } from "@/lib/data"
import { VisibilityBadge } from "@/components/visibility-badge"

export default function AccountPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader active="account" />
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-6 py-10 md:px-10">
        <div className="mb-2 flex items-center gap-2 text-[12px] text-muted-foreground">
          <Link href="/" className="hover:text-primary">
            Home
          </Link>
          <span aria-hidden>/</span>
          <span className="text-foreground">Account</span>
        </div>

        {/* Profile header */}
        <section className="rounded-3xl bg-card p-6 ring-1 ring-border md:p-8">
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-5">
              <div className="relative h-20 w-20 overflow-hidden rounded-full ring-1 ring-border">
                <Image src={CURRENT_USER.avatar || "/placeholder.svg"} alt="" fill className="object-cover" />
              </div>
              <div>
                <h1 className="font-display text-[34px] leading-tight tracking-[-0.01em] text-primary">
                  {CURRENT_USER.displayName}
                </h1>
                <p className="mt-1 text-[13.5px] text-muted-foreground">
                  {CURRENT_USER.email} · {CURRENT_USER.joinedAt}
                </p>
                <p className="mt-2 max-w-lg text-[13.5px] leading-relaxed text-foreground/80">{CURRENT_USER.bio}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-[13px] font-medium text-foreground ring-1 ring-border hover:ring-primary/40"
              >
                <Settings className="size-4" aria-hidden />
                Settings
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 text-[13px] font-medium text-foreground ring-1 ring-border hover:ring-[color:var(--color-error)]/40"
              >
                <LogOut className="size-4" aria-hidden />
                Log out
              </button>
            </div>
          </div>

          {/* Stats */}
          <dl className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { icon: Compass, label: "Owned trips", value: CURRENT_USER.stats.trips },
              { icon: Shield, label: "Joined", value: CURRENT_USER.stats.joined },
              { icon: Bookmark, label: "Collections", value: CURRENT_USER.stats.collections },
              { icon: Heart, label: "Liked trips", value: CURRENT_USER.stats.likes },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-2xl bg-secondary/50 p-4 ring-1 ring-border">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Icon className="size-4" aria-hidden />
                  <span className="text-[12px] uppercase tracking-wider">{label}</span>
                </div>
                <div className="mt-1 font-display text-[28px] text-primary">{value}</div>
              </div>
            ))}
          </dl>
        </section>

        {/* Quick links */}
        <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <QuickCard
            title="My trips"
            count={MY_TRIPS.length + JOINED_TRIPS.length}
            description="Resume drafts and revisit accepted itineraries."
            href="/trips"
          />
          <QuickCard
            title="Collections"
            count={COLLECTIONS.length}
            description="Visual planning boards from saved public trips."
            href="/collections"
          />
          <QuickCard
            title="Liked trips"
            count={CURRENT_USER.stats.likes}
            description="Inspiration ready to seed your next plan."
            href="/likes"
          />
        </section>

        {/* Recent trips */}
        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="font-display text-[26px] tracking-tight text-primary">Recent trips</h2>
            <Link href="/trips" className="text-[13px] font-medium text-accent hover:underline">
              View all
            </Link>
          </div>
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {MY_TRIPS.slice(0, 3).map((t) => (
              <li
                key={t.id}
                className="overflow-hidden rounded-2xl bg-card ring-1 ring-border transition hover:ring-primary/40"
              >
                <Link href={`/trips/${t.id}`} className="block">
                  <div className="relative aspect-[16/10]">
                    <Image src={t.cover || "/placeholder.svg"} alt="" fill sizes="33vw" className="object-cover" />
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display text-[18px] leading-tight tracking-tight text-primary">
                        {t.title}
                      </h3>
                      <VisibilityBadge visibility={t.visibility} />
                    </div>
                    <p className="mt-1 text-[12.5px] text-muted-foreground">
                      {t.days} days · {t.estBudget}
                    </p>
                    <p className="mt-2 text-[12px] text-muted-foreground">{t.updated}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <AppFooter />
    </div>
  )
}

function QuickCard({
  title,
  count,
  description,
  href,
}: {
  title: string
  count: number
  description: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="group flex items-start justify-between gap-4 rounded-2xl bg-card p-5 ring-1 ring-border transition hover:ring-primary/40"
    >
      <div>
        <div className="font-display text-[20px] tracking-tight text-primary">{title}</div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div className="font-display text-[34px] leading-none text-primary/80 group-hover:text-primary">{count}</div>
    </Link>
  )
}
