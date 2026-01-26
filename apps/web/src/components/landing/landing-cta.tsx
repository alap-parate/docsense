import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function LandingCTA() {
  return (
    <section className="container mx-auto space-y-6 px-4 py-12 sm:py-16 md:py-24 lg:py-32">
      <div className="bg-primary/5 border-primary/20 mx-auto flex max-w-4xl flex-col items-center gap-4 sm:gap-6 rounded-xl sm:rounded-2xl border p-6 sm:p-8 md:p-12 text-center">
        <h2 className="text-2xl font-bold leading-tight sm:text-3xl md:text-4xl lg:text-5xl">
          Ready to Transform Your Document Workflow?
        </h2>
        <p className="max-w-2xl text-sm sm:text-base md:text-lg text-muted-foreground">
          Join thousands of teams using DocSense to unlock insights from their
          documents with AI-powered intelligence.
        </p>
        <Button size="lg" className="w-full gap-2 sm:w-auto">
          Get Started Free
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </section>
  )
}
