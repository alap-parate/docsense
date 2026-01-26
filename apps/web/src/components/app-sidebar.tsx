import * as React from "react"
import {
  FileText,
  SquaresExclude,
  LayoutDashboard,
  LayoutGrid,
  MessageCircle,
  History,
  LineChart,
  Cog,
  CreditCard,
  Shield,
  Settings,
  ChevronDown,
  Search,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Link, useRouterState } from "@tanstack/react-router"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import { useWorkspaceStore } from "@/store/workspace-store"
import { useWorkspaces, type Workspace } from "@/hooks/use-workspaces"

const mainNav = [
  { title: "Dashboard", url: "/app/dashboard", icon:  LayoutDashboard},
  { title: "Workspaces", url: "/app/workspaces", icon: SquaresExclude },
  { title: "Documents", url: "/app/documents", icon: FileText },
  { title: "Search", url: "/app/search", icon: Search },
  { title: "Ask AI", url: "/app/search/ask-ai", icon: MessageCircle },
] as const

const utilityNav = [
  { title: "Query History", url: "/app/query-history", icon: History },
  { title: "Insights", url: "/app/insights", icon: LineChart },
  { title: "Jobs & Processing", url: "/app/jobs", icon: Cog },
  { title: "Usage & Billing", url: "/app/billing", icon: CreditCard },
  { title: "Security", url: "/app/security", icon: Shield },
  { title: "Settings", url: "/app/settings", icon: Settings },
] as Array<{
  title: string
  url: string
  icon: React.ComponentType<{ className?: string }>
  isActive?: boolean
}>

export function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const router = useRouterState()
  const { user, signOut } = useAuth()
  const currentPath = router.location.pathname
  const { currentWorkspace, setCurrentWorkspace } = useWorkspaceStore()
  const { data: workspacesData, isLoading: workspacesLoading } = useWorkspaces()

  const workspaces = workspacesData?.data?.workspaces || []

  React.useEffect(() => {
    // Auto-select first workspace if none selected
    if (!currentWorkspace && workspaces.length > 0) {
      setCurrentWorkspace(workspaces[0])
    }
  }, [workspaces, currentWorkspace, setCurrentWorkspace])

  const getUserInitials = () => {
    if (!user) return "U"
    const email = user.email || ""
    const name = user.user_metadata?.full_name || email
    return name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getUserName = () => {
    if (!user) return "User"
    return user.user_metadata?.full_name || user.email?.split("@")[0] || "User"
  }

  const getUserEmail = () => {
    if (!user) return ""
    return user.email || ""
  }

  return (
    <Sidebar variant="floating" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/app/dashboard">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <FileText className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">DocSense</span>
                  <span className="text-xs text-muted-foreground">
                    Document Intelligence
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <div className="px-2 py-2">
          <p className="text-sidebar-foreground/70 mb-1.5 text-xs font-medium">
            Select Workspace
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  "ring-sidebar-ring flex w-full items-center gap-2 overflow-hidden rounded-md px-2 py-2 text-left text-sm outline-hidden transition-colors focus-visible:ring-2",
                  "border border-sidebar-border/60 bg-sidebar/50"
                )}
              >
                <LayoutGrid className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">
                  {currentWorkspace?.name || "No Workspace"}
                </span>
                <ChevronDown className="size-4 shrink-0 opacity-50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[--radix-dropdown-menu-trigger-width]">
              <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {workspacesLoading ? (
                <DropdownMenuItem disabled>Loading...</DropdownMenuItem>
              ) : workspaces.length === 0 ? (
                <>
                  <DropdownMenuItem disabled>No workspaces</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/app/workspaces">Manage workspaces</Link>
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  {workspaces.map((workspace: Workspace) => (
                    <DropdownMenuItem
                      key={workspace.id}
                      onClick={() => setCurrentWorkspace(workspace)}
                      className={cn(
                        currentWorkspace?.id === workspace.id && "bg-accent"
                      )}
                    >
                      {workspace.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/app/workspaces">Manage workspaces</Link>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarMenu className="gap-1">
            {mainNav.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild isActive={currentPath === item.url}>
                  <Link to={item.url}>
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarMenu className="gap-1">
            {utilityNav.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild isActive={currentPath === item.url}>
                  <Link to={item.url}>
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="size-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-sm font-medium">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 items-start gap-0.5 text-left text-sm leading-none">
                    <span className="truncate font-medium">{getUserName()}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {getUserEmail()}
                    </span>
                  </div>
                  <ChevronDown className="size-4 opacity-50" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                side="top"
                className="w-[--radix-dropdown-menu-trigger-width]"
              >
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/app/dashboard">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/app/dashboard">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
