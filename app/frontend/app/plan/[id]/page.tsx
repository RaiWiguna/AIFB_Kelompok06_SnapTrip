import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { AppFooter } from "@/components/app-footer"
import { AppHeader } from "@/components/app-header"
import { PlannerWorkspace } from "@/components/planner/planner-workspace"
import { IMG, getPlanSession } from "@/lib/data"

export default async function PlannerSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = getPlanSession(id)
  if (!session) notFound()

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[700px] opacity-40">
        <Image src={IMG.baliCoastalPano || "/placeholder.svg"} alt="" fill sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/85 to-background" />
      </div>

      <AppHeader active="plan" />

      <main className="mx-auto w-full max-w-[1480px] flex-1 px-6 pb-24 pt-4 md:px-10">
        <nav aria-label="Breadcrumb" className="mb-6 text-[12.5px] text-muted-foreground">
          <Link href="/trips" className="hover:text-primary">
            My trips
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{session.title}</span>
        </nav>

        <PlannerWorkspace tripId={session.id} title={session.title} />
      </main>

      <AppFooter />
    </div>
  )
}
