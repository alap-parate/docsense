import {
  FileText,
  Search,
  MessageCircle,
  Users,
} from "lucide-react"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const features = [
  {
    title: "Upload & Organize",
    description:
      "Upload PDFs and documents, organize them into workspaces and folders for easy management.",
    icon: FileText,
  },
  {
    title: "AI-Powered Search",
    description:
      "Find what you need instantly with RAG/Hybrid search and intelligent keyword matching.",
    icon: Search,
  },
  {
    title: "Intelligent Q&A",
    description:
      "Ask questions about your documents and get AI-powered answers with context and citations.",
    icon: MessageCircle,
  },
  {
    title: "Team Collaboration",
    description:
      "Share workspaces, invite team members, and collaborate seamlessly on documents.",
    icon: Users,
  },
]

export function LandingFeatures() {
  return (
    <section className="container mx-auto space-y-6 px-4 py-12 sm:py-16 md:py-24 lg:py-32">
      <div className="mx-auto flex max-w-232 flex-col items-center space-y-3 sm:space-y-4 text-center px-4">
        <h2 className="text-2xl font-bold leading-[1.1] sm:text-3xl md:text-4xl lg:text-5xl">
          Powerful Features for Document Intelligence
        </h2>
        <p className="max-w-340 text-sm text-muted-foreground sm:text-base md:text-lg">
          Everything you need to manage, search, and extract insights from your
          documents.
        </p>
      </div>
      <div className="mx-auto grid justify-center gap-4 px-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature) => (
          <Card key={feature.title} className="w-full flex h-full flex-col">
            <CardHeader className="flex-1 space-y-3">
              <div className="bg-primary/10 text-primary flex size-10 sm:size-12 items-center justify-center rounded-lg shrink-0">
                <feature.icon className="size-5 sm:size-6" />
              </div>
              <div className="space-y-2">
                <CardTitle className="text-base sm:text-lg">{feature.title}</CardTitle>
                <CardDescription className="text-sm sm:text-base leading-relaxed">
                  {feature.description}
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  )
}
