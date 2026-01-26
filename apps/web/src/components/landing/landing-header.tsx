import * as React from "react"
import { FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Link } from "@tanstack/react-router"
import { useAuth } from "@/contexts/auth-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export function LandingHeader() {
  const { user, signOut } = useAuth()

  const getUserInitials = () => {
    if (!user) return "U"
    const email = user.email || ""
    const name = user.user_metadata?.full_name || email
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 sm:h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-1.5 sm:gap-2">
          <div className="bg-primary text-primary-foreground flex aspect-square size-7 sm:size-8 items-center justify-center rounded-lg">
            <FileText className="size-3.5 sm:size-4" />
          </div>
          <span className="text-lg sm:text-xl font-bold">DocSense</span>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {user ? (
            <>
              <Link to="/app/dashboard" className="hidden sm:block">
                <Button size="sm" className="text-xs sm:text-sm">
                  Go to DocSense
                </Button>
              </Link>
              <Link to="/app/dashboard" className="sm:hidden">
                <Button size="sm" variant="ghost" className="px-2">
                  <span className="sr-only">Go to DocSense</span>
                  <FileText className="size-4" />
                </Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative size-7 sm:size-8 rounded-full p-0">
                    <Avatar className="size-7 sm:size-8">
                      <AvatarFallback className="text-xs sm:text-sm">{getUserInitials()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user.user_metadata?.full_name || "User"}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/app/dashboard">Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/app">App</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()}>
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link to="/auth/login">
                <Button variant="ghost" size="sm" className="inline-flex">
                  Login
                </Button>
              </Link>
              <Link to="/auth/signup">
                <Button size="sm" className="text-xs sm:text-sm px-3 sm:px-4">
                  Sign Up
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
