import * as React from "react"
import { useRouterState } from "@tanstack/react-router"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

// Map of paths to page titles
const pageTitles: Record<string, string> = {
  "/app": "Welcome",
  "/app/dashboard": "Dashboard",
  "/app/overview": "Overview",
  "/app/workspaces": "Workspaces",
  "/app/documents": "Documents",
  "/app/search": "Search",
  "/app/search/ask-ai": "Ask AI",
  "/app/query-history": "Query History",
  "/app/insights": "Insights",
  "/app/jobs": "Jobs & Processing",
  "/app/billing": "Usage & Billing",
  "/app/security": "Security",
  "/app/settings": "Settings",
  "/app/profile": "Profile",
}

function getPageTitle(pathname: string): string {
  // Check for exact matches first (more specific routes)
  if (pageTitles[pathname]) {
    return pageTitles[pathname]
  }
  // Check for routes with trailing slash
  if (pageTitles[pathname + '/']) {
    return pageTitles[pathname + '/']
  }
  // Check for routes without trailing slash
  if (pathname.endsWith('/') && pageTitles[pathname.slice(0, -1)]) {
    return pageTitles[pathname.slice(0, -1)]
  }
  return "DocSense"
}

export function AppTopbar() {
  const router = useRouterState()
  const pathname = router.location.pathname
  const pageTitle = getPageTitle(pathname)

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-6" />
      <h1 className="text-lg font-semibold">{pageTitle}</h1>
    </header>
  )
}
