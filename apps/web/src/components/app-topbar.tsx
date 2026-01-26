import { useRouterState } from "@tanstack/react-router"
import { Moon, Sun, Monitor } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "@/components/custom/theme-provider"

// Map of paths to page titles
const pageTitles: Record<string, string> = {
  "/app": "Welcome",
  "/app/dashboard": "Dashboard",
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
  const { theme, setTheme } = useTheme()

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-6" />
      <h1 className="text-lg font-semibold">{pageTitle}</h1>

      <div className="ml-auto flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Sun className="size-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute size-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme("light")}>
              <Sun className="size-4 mr-2" />
              Light
              {theme === "light" && <span className="ml-auto text-xs text-muted-foreground">Active</span>}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              <Moon className="size-4 mr-2" />
              Dark
              {theme === "dark" && <span className="ml-auto text-xs text-muted-foreground">Active</span>}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>
              <Monitor className="size-4 mr-2" />
              System
              {theme === "system" && <span className="ml-auto text-xs text-muted-foreground">Active</span>}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
