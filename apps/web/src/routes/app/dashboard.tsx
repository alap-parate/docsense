import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/app/dashboard")({
  component: DashboardPage,
})

function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to your DocSense dashboard
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-card rounded-lg border p-6">
          <h3 className="font-semibold">Documents</h3>
          <p className="text-2xl font-bold mt-2">0</p>
        </div>
        <div className="bg-card rounded-lg border p-6">
          <h3 className="font-semibold">Workspaces</h3>
          <p className="text-2xl font-bold mt-2">0</p>
        </div>
        <div className="bg-card rounded-lg border p-6">
          <h3 className="font-semibold">Queries</h3>
          <p className="text-2xl font-bold mt-2">0</p>
        </div>
        <div className="bg-card rounded-lg border p-6">
          <h3 className="font-semibold">Storage</h3>
          <p className="text-2xl font-bold mt-2">0 MB</p>
        </div>
      </div>
    </div>
  )
}
