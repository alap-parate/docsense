import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { LandingPage } from "@/components/landing/landing-page"
import { useAuth } from "@/contexts/auth-context"
import { useEffect } from "react"

export const Route = createFileRoute("/")({
  component: IndexComponent,
})

function IndexComponent() {
  return <LandingPage />
}
