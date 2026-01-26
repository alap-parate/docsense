import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"
import { PDFViewerPage } from "@/pages/pdf-viewer"

const pdfViewerSearchSchema = z.object({
  fileId: z.string().optional(),
  page: z.preprocess(
    (val) => {
      if (val === undefined || val === null) return undefined
      return String(val)
    },
    z.string().optional()
  ),
  markedTexts: z.preprocess(
    (val) => {
      // Accept both string (JSON) and array, always return string
      if (val === undefined || val === null) return undefined
      if (typeof val === "string") return val
      if (Array.isArray(val)) return JSON.stringify(val)
      return String(val)
    },
    z.string().optional()
  ),
})

export const Route = createFileRoute("/app/pdf-viewer")({
  component: PDFViewerPage,
  validateSearch: pdfViewerSearchSchema,
})
