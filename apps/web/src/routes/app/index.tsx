import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/app/")({
  component: AppIndex,
})

function AppIndex() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Welcome to DocSense</h1>
        <p className="mt-4 text-muted-foreground">
          Your document intelligence platform
        </p>
      </div>
    </div>
  )
}
