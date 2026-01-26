import { ThemeProvider } from "@/components/custom/theme-provider"
import { LandingPage } from "@/components/landing/landing-page"

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <LandingPage />
    </ThemeProvider>
  )
}

export default App
