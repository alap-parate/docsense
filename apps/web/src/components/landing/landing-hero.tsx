import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function LandingHero() {
  return (
    <section className="container mx-auto space-y-6 px-4 py-12 text-center sm:py-16 md:py-24 lg:py-32">
      <div className="mx-auto flex max-w-[64rem] flex-col items-center gap-4 px-4 sm:gap-6">
        <h1 className="text-3xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl">
          Your AI-Powered
          <br />
          <span className="text-primary">Document Intelligence</span>
          <br />
          Platform
        </h1>
        <p className="max-w-[42rem] text-base text-muted-foreground sm:text-lg md:text-xl">
          Upload, organize, and extract insights from your documents with
          AI-powered search and intelligent Q&A. Collaborate with your team
          in organized workspaces.
        </p>
        <div className="flex w-full justify-center gap-4 sm:w-auto">
          <Button size="lg" className="w-full gap-2 sm:w-auto">
            Start Free
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
      <div className="mx-auto max-w-5xl px-4">
        <div className="bg-muted/50 aspect-video rounded-lg sm:rounded-xl border" />
      </div>
    </section>
  )
}
