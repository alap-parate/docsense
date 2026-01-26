import { Upload, Search, MessageCircle, Users } from "lucide-react"

const steps = [
  {
    step: "01",
    title: "Upload Documents",
    description:
      "Upload your PDFs and documents to create a centralized knowledge base. Organize them into workspaces and folders.",
    icon: Upload,
  },
  {
    step: "02",
    title: "AI-Powered Search",
    description:
      "Use our advanced search to find information across all your documents with RAG and hybrid search capabilities.",
    icon: Search,
  },
  {
    step: "03",
    title: "Ask Questions",
    description:
      "Get instant answers to your questions with AI-powered Q&A that understands context from your documents.",
    icon: MessageCircle,
  },
  {
    step: "04",
    title: "Collaborate",
    description:
      "Share workspaces with your team, invite members, and collaborate on documents in real-time.",
    icon: Users,
  },
]

export function LandingHowItWorks() {
  return (
    <section className="container mx-auto space-y-6 px-4 py-12 sm:py-16 md:py-24 lg:py-32">
      <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-3 sm:space-y-4 text-center px-4">
        <h2 className="text-2xl font-bold leading-[1.1] sm:text-3xl md:text-4xl lg:text-5xl">
          How It Works
        </h2>
        <p className="max-w-[85rem] text-sm text-muted-foreground sm:text-base md:text-lg">
          Get started in minutes with our simple workflow
        </p>
      </div>
      <div className="mx-auto grid max-w-5xl gap-6 px-4 sm:gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step) => (
          <div key={step.step} className="relative">
            <div className="bg-primary/10 text-primary mb-3 sm:mb-4 flex size-10 sm:size-12 items-center justify-center rounded-lg">
              <step.icon className="size-5 sm:size-6" />
            </div>
            <div className="text-muted-foreground mb-2 text-xs sm:text-sm font-medium">
              Step {step.step}
            </div>
            <h3 className="mb-2 text-lg sm:text-xl font-semibold">{step.title}</h3>
            <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
