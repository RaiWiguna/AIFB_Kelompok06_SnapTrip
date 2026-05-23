import { SiteFooter } from "@/components/site-footer"
import { HeroSection } from "@/components/landing/hero-section"
import { FindTripsSection } from "@/components/landing/find-trips-section"
import { ImagePreferenceSection } from "@/components/landing/image-preference-section"
import { RecommendationsSection } from "@/components/landing/recommendations-section"
import { PlanWorkspaceSection } from "@/components/landing/plan-workspace-section"
import { ShareSection } from "@/components/landing/share-section"
import { CtaSection } from "@/components/landing/cta-section"

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <main className="flex-1">
        <HeroSection />
        <FindTripsSection />
        <ImagePreferenceSection />
        <RecommendationsSection />
        <PlanWorkspaceSection />
        <ShareSection />
        <CtaSection />
      </main>
      <SiteFooter />
    </div>
  )
}
