import { LandingHeader } from "./landing-header"
import { LandingHero } from "./landing-hero"
import { LandingFeatures } from "./landing-features"
import { LandingHowItWorks } from "./landing-how-it-works"
import { LandingCTA } from "./landing-cta"
import { LandingFooter } from "./landing-footer"

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <LandingHeader />
      <main className="flex-1 w-full">
        <LandingHero />
        <LandingFeatures />
        <LandingHowItWorks />
        <LandingCTA />
      </main>
      <LandingFooter />
    </div>
  )
}
