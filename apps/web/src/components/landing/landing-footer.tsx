import { FileText } from "lucide-react"
import { Button } from "@/components/ui/button"

export function LandingFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto flex flex-col gap-6 sm:gap-8 px-4 py-8 sm:py-12 md:py-16">
        <div className="grid gap-6 sm:gap-8 grid-cols-2 sm:grid-cols-2 md:grid-cols-4">
          <div className="flex flex-col gap-3 sm:gap-4 col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2">
              <div className="bg-primary text-primary-foreground flex aspect-square size-7 sm:size-8 items-center justify-center rounded-lg">
                <FileText className="size-3.5 sm:size-4" />
              </div>
              <span className="text-lg sm:text-xl font-bold">DocSense</span>
            </div>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Your AI-Powered Document Intelligence Platform
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:gap-4">
            <h3 className="text-sm sm:text-base font-semibold">Product</h3>
            <ul className="flex flex-col gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  Pricing
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  Security
                </a>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-3 sm:gap-4">
            <h3 className="text-sm sm:text-base font-semibold">Company</h3>
            <ul className="flex flex-col gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  About
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  Blog
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  Careers
                </a>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-3 sm:gap-4 col-span-2 sm:col-span-1">
            <h3 className="text-sm sm:text-base font-semibold">Support</h3>
            <ul className="flex flex-col gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t pt-6 sm:pt-8 md:flex-row">
          <p className="text-muted-foreground text-xs sm:text-sm text-center md:text-left">
            © {new Date().getFullYear()} DocSense. All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-4">
            <Button variant="ghost" size="sm" className="text-xs sm:text-sm h-8 sm:h-9">
              Privacy Policy
            </Button>
            <Button variant="ghost" size="sm" className="text-xs sm:text-sm h-8 sm:h-9">
              Terms of Service
            </Button>
          </div>
        </div>
      </div>
    </footer>
  )
}
