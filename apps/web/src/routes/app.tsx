import { createFileRoute, Outlet, redirect, useLocation } from "@tanstack/react-router"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { AppTopbar } from "@/components/app-topbar"
import { useAuth } from "@/contexts/auth-context"

export const Route = createFileRoute("/app")({
  component: AppLayout,
  beforeLoad: async ({ context }) => {
    // Check auth in component instead
  },
})

function AppLayout() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!user) {
    window.location.href = "/auth/login"
    return null
  }

  // Check if current route is PDF viewer to render full-screen
  const isPdfViewer = location.pathname.includes("/pdf-viewer")

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "16rem",
      } as React.CSSProperties}
    >
      {!isPdfViewer && <AppSidebar />}
      <SidebarInset>
        {!isPdfViewer && <AppTopbar />}
        <div className={`flex flex-1 flex-col ${!isPdfViewer ? "p-4" : ""}`}>
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
