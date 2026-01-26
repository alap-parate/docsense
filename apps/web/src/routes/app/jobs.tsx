import { createFileRoute } from "@tanstack/react-router"
import { Cog, Construction } from "lucide-react"

export const Route = createFileRoute("/app/jobs")({
  component: JobsPage,
})

function JobsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
      <div className="relative">
        <div className="rounded-full bg-muted p-6">
          <Cog className="size-12 text-muted-foreground" />
        </div>
        <div className="absolute -bottom-1 -right-1 rounded-full bg-amber-100 dark:bg-amber-900/30 p-2">
          <Construction className="size-5 text-amber-600 dark:text-amber-400" />
        </div>
      </div>
      <div className="text-center space-y-2 max-w-md">
        <h1 className="text-2xl font-bold">Jobs & Processing</h1>
        <p className="text-muted-foreground">
          This feature is currently under development. Soon you'll be able to monitor document processing jobs, indexing status, and background tasks.
        </p>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-full px-4 py-2">
        <Construction className="size-4" />
        <span>Coming Soon</span>
      </div>
    </div>
  )
}
