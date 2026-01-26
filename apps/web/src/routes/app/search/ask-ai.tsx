import { createFileRoute } from "@tanstack/react-router"
import { AskAIPage } from "@/pages/ask-ai"

export const Route = createFileRoute("/app/search/ask-ai")({
  component: AskAIPage,
})
