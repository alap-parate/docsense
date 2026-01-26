import { createFileRoute } from "@tanstack/react-router"
import { WorkspacesPage } from "@/pages/workspaces"

export const Route = createFileRoute("/app/workspaces")({
  component: WorkspacesPage,
})
