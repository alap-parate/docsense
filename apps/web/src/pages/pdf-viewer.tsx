import * as React from "react"
import { useSearch } from "@tanstack/react-router"
import { useWorkspaceStore } from "@/store/workspace-store"
import apiClient from "@/lib/api"
import { Loader2 } from "lucide-react"

export function PDFViewerPage() {
  const search = useSearch({ from: "/app/pdf-viewer" })
  const { currentWorkspace } = useWorkspaceStore()
  const tenantId = currentWorkspace?.id

  const [pdfUrl, setPdfUrl] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const iframeRef = React.useRef<HTMLIFrameElement>(null)

  const normalizeParam = (val: unknown): string | undefined => {
    if (val === undefined || val === null) return undefined
    if (typeof val !== "string") return String(val)
    try {
      if (
        (val.startsWith("\"") && val.endsWith("\"")) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        return JSON.parse(val)
      }
    } catch {
      return val
    }
    return val
  }

  const fileId = normalizeParam((search as any)?.fileId)
  const pageParam = normalizeParam((search as any)?.page)
  const targetPage = pageParam ? parseInt(pageParam, 10) : 1
  
  // Parse marked texts from JSON string or fallback snippet
  const markedTexts: string[] = React.useMemo(() => {
    try {
      const markedTextsParam = normalizeParam((search as any)?.markedTexts)
      if (markedTextsParam) {
        let parsed: any = markedTextsParam

        // First parse if it's JSON
        if (typeof parsed === "string" && parsed.trim().startsWith("[")) {
          parsed = JSON.parse(parsed)
        }

        // Handle double-encoded JSON strings (e.g. "\"[\\\"foo\\\"]\"")
        if (typeof parsed === "string" && parsed.trim().startsWith("[")) {
          parsed = JSON.parse(parsed)
        }

        const parsedTexts = Array.isArray(parsed)
          ? parsed.filter((t: any) => typeof t === "string" && t.trim().length > 0)
          : []
        if (parsedTexts.length > 0) return parsedTexts
      }

      const snippetParam = normalizeParam((search as any)?.snippet)
      if (!snippetParam || typeof snippetParam !== "string") return []
      const normalizedSnippet = snippetParam.replace(/\s+/g, " ").trim()
      return normalizedSnippet ? [normalizedSnippet] : []
    } catch (err) {
      console.error("Error parsing marked texts:", err)
      return []
    }
  }, [(search as any)?.markedTexts, (search as any)?.snippet])

  // Fetch PDF URL
  React.useEffect(() => {
    if (!fileId || !tenantId) {
      setError("Missing file ID or workspace")
      setLoading(false)
      return
    }

    const fetchPdfUrl = async () => {
      try {
        const response = await apiClient.get(`/api/v1/files/${fileId}/download?tenantId=${tenantId}`)
        if (response.data?.data?.url) {
          setPdfUrl(response.data.data.url)
        } else {
          setError("Failed to get PDF URL")
          setLoading(false)
        }
      } catch (err) {
        setError("Failed to load PDF")
        setLoading(false)
      }
    }

    fetchPdfUrl()
  }, [fileId, tenantId])

  // Prevent body scrolling when PDF viewer is mounted
  React.useEffect(() => {
    const originalOverflow = document.body.style.overflow
    const originalHtmlOverflow = document.documentElement.style.overflow
    
    document.body.style.overflow = "hidden"
    document.documentElement.style.overflow = "hidden"
    
    return () => {
      document.body.style.overflow = originalOverflow
      document.documentElement.style.overflow = originalHtmlOverflow
    }
  }, [])

  // Handle iframe load and highlight text
  React.useEffect(() => {
    if (!pdfUrl || !iframeRef.current) return

    const iframe = iframeRef.current
    const handleLoad = () => {
      setLoading(false)

      if (markedTexts.length === 0) return

      // Wait for PDF.js viewer to be ready
      setTimeout(() => {
        try {
          const iframeWindow = iframe.contentWindow
          if (!iframeWindow) return

          // Wait a bit more for PDF to load
          setTimeout(() => {
            highlightTextInViewer(iframeWindow, markedTexts)
          }, 1500)
        } catch (err) {
          console.error("Error interacting with PDF viewer:", err)
        }
      }, 500)
    }

    iframe.addEventListener("load", handleLoad)
    return () => {
      iframe.removeEventListener("load", handleLoad)
    }
  }, [pdfUrl, markedTexts])

  // Highlight text in the PDF.js viewer using text layer
  const highlightTextInViewer = (iframeWindow: Window, textsToHighlight: string[]) => {
    try {
      if (textsToHighlight.length === 0) return

      const viewer = (iframeWindow as any).PDFViewerApplication
      if (!viewer) {
        // Retry after a short delay if viewer not ready
        setTimeout(() => highlightTextInViewer(iframeWindow, textsToHighlight), 500)
        return
      }

      // Wait for the page to be rendered
      const waitForPage = () => {
        const pageNumber = targetPage
        const pageView = viewer.pdfViewer.getPageView(pageNumber - 1)
        
        if (!pageView || !pageView.renderingState) {
          setTimeout(waitForPage, 200)
          return
        }

        // Get the text layer for this page
        const pageDiv = pageView.div
        if (!pageDiv) {
          setTimeout(waitForPage, 200)
          return
        }

        const textLayer = pageDiv.querySelector(".textLayer")
        if (!textLayer) {
          setTimeout(waitForPage, 200)
          return
        }

        // Highlight each marked text in the text layer
        textsToHighlight.forEach((text) => {
          highlightTextInLayer(iframeWindow, textLayer, text)
        })

        // Scroll to the first highlight
        if (textsToHighlight.length > 0) {
          scrollToFirstHighlight(textLayer)
        }
      }

      // Start waiting for page
      waitForPage()
    } catch (err) {
      console.error("Error highlighting text:", err)
    }
  }

  // Simple function to highlight text in the text layer
  const highlightTextInLayer = (
    iframeWindow: Window,
    textLayer: Element,
    searchText: string
  ) => {
    try {
      const doc = iframeWindow.document
      const searchNormalized = searchText.replace(/\s+/g, " ").trim()
      if (!searchNormalized || searchNormalized.length < 1) return
      
      const escapeRegExp = (value: string) =>
        value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

      // Get all text content from the text layer
      const fullText = textLayer.textContent || ""
      const fullTextLower = fullText.toLowerCase()

      const matches: Array<{ start: number; end: number }> = []

      const addMatches = (regex: RegExp) => {
        let match: RegExpExecArray | null
        while ((match = regex.exec(fullText)) !== null) {
          matches.push({
            start: match.index,
            end: match.index + match[0].length
          })
          if (regex.lastIndex === match.index) regex.lastIndex++
        }
      }

      // Break phrase into chunks for fuzzy matching
      const breakIntoChunks = (text: string): string[] => {
        const chunks: string[] = []
        
        // Split by sentence boundaries (., !, ?) and common delimiters
        const sentences = text.split(/[.!?]+\s*|\n+|\.\.\.+/)
        
        for (const sentence of sentences) {
          const trimmed = sentence.trim()
          if (trimmed.length >= 8) {
            chunks.push(trimmed)
          }
        }
        
        // Also split by commas/semicolons for clause-level matching
        const clauses = text.split(/[,;]+\s*/)
        for (const clause of clauses) {
          const trimmed = clause.trim()
          if (trimmed.length >= 10) {
            chunks.push(trimmed)
          }
        }
        
        // Extract significant word sequences (3+ words)
        const words = text.split(/\s+/).filter((w) => w.length >= 3)
        for (let i = 0; i < words.length - 2; i++) {
          const phrase = words.slice(i, i + 3).join(" ")
          if (phrase.length >= 10) {
            chunks.push(phrase)
          }
        }
        
        return [...new Set(chunks)]
      }

      // 1) Try exact/flexible matching first
      const exactPattern = escapeRegExp(searchNormalized).replace(/\\\s+/g, "[\\s\\u00A0]+")
      addMatches(new RegExp(exactPattern, "gi"))

      // 2) Flexible match treating spaces/hyphens/newlines as equivalent
      const flexibleParts = searchNormalized.split(/[\s\u00A0\-–—]+/).filter(Boolean)
      if (flexibleParts.length > 0) {
        const flexiblePattern = flexibleParts.map(escapeRegExp).join("[\\s\\u00A0\\-–—\\n\\r]*")
        addMatches(new RegExp(flexiblePattern, "gi"))
      }

      // 3) Fuzzy: break into chunks and match each
      const chunks = breakIntoChunks(searchNormalized)
      for (const chunk of chunks) {
        const chunkLower = chunk.toLowerCase()
        
        // Simple substring search for chunks
        let searchIndex = 0
        while ((searchIndex = fullTextLower.indexOf(chunkLower, searchIndex)) !== -1) {
          matches.push({
            start: searchIndex,
            end: searchIndex + chunk.length
          })
          searchIndex += chunk.length
        }
        
        // Also try flexible pattern for chunks
        const chunkParts = chunk.split(/[\s\u00A0\-–—]+/).filter((p) => p.length >= 2)
        if (chunkParts.length >= 2) {
          const chunkPattern = chunkParts.map(escapeRegExp).join("[\\s\\u00A0\\-–—\\n\\r.,;:()]*")
          try {
            addMatches(new RegExp(chunkPattern, "gi"))
          } catch {
            // Invalid regex, skip
          }
        }
      }

      // 4) Match significant individual words (4+ chars, not stopwords)
      const stopwords = new Set([
        "the", "and", "but", "for", "with", "this", "that", "from", "have", "been",
        "will", "would", "could", "should", "which", "where", "when", "what", "than",
        "into", "over", "such", "only", "other", "some", "these", "those", "then"
      ])
      const significantWords = searchNormalized
        .split(/[\s\u00A0\-–—.,;:()]+/)
        .filter((word) => word.length >= 5 && !stopwords.has(word.toLowerCase()))

      for (const word of significantWords) {
        const wordLower = word.toLowerCase()
        let searchIndex = 0
        while ((searchIndex = fullTextLower.indexOf(wordLower, searchIndex)) !== -1) {
          matches.push({
            start: searchIndex,
            end: searchIndex + word.length
          })
          searchIndex += word.length
        }
      }

      // De-duplicate and merge overlapping matches
      if (matches.length === 0) return

      const sorted = matches.sort((a, b) => a.start - b.start || b.end - a.end)
      const merged: Array<{ start: number; end: number }> = []
      
      for (const match of sorted) {
        const last = merged[merged.length - 1]
        if (last && match.start <= last.end) {
          last.end = Math.max(last.end, match.end)
        } else {
          merged.push({ ...match })
        }
      }

      const finalMatches = merged
      
      // Process matches in reverse to maintain correct positions when modifying DOM
      for (let i = finalMatches.length - 1; i >= 0; i--) {
        const match = finalMatches[i]
        
        try {
          const range = doc.createRange()
          
          const walker = doc.createTreeWalker(
            textLayer,
            NodeFilter.SHOW_TEXT,
            null
          )
          
          let currentPos = 0
          let startNode: Text | null = null
          let startOffset = 0
          let endNode: Text | null = null
          let endOffset = 0
          
          let node: Node | null
          while ((node = walker.nextNode())) {
            const textNode = node as Text
            const text = textNode.textContent || ""
            const nodeLength = text.length
            const nodeStart = currentPos
            const nodeEnd = currentPos + nodeLength
            
            if (!startNode && match.start >= nodeStart && match.start < nodeEnd) {
              startNode = textNode
              startOffset = match.start - nodeStart
            }
            
            if (match.end > nodeStart && match.end <= nodeEnd) {
              endNode = textNode
              endOffset = match.end - nodeStart
              break
            }
            
            currentPos = nodeEnd
          }
          
          if (startNode && endNode) {
            range.setStart(startNode, startOffset)
            range.setEnd(endNode, endOffset)
            
            const highlightSpan = doc.createElement("span")
            highlightSpan.className = "pdfjs-highlight"
            highlightSpan.style.backgroundColor = "rgba(255, 255, 0, 0.4)"
            highlightSpan.style.color = "inherit"
            
            try {
              range.surroundContents(highlightSpan)
            } catch (e) {
              // If surroundContents fails (e.g., range spans multiple parents),
              // extract and wrap manually
              const contents = range.extractContents()
              highlightSpan.appendChild(contents)
              range.insertNode(highlightSpan)
            }
          }
        } catch (err) {
          console.error("Error highlighting match:", err)
        }
      }
    } catch (err) {
      console.error("Error highlighting in layer:", err)
    }
  }

  // Scroll to the first highlight
  const scrollToFirstHighlight = (textLayer: Element) => {
    try {
      const highlights = textLayer.querySelectorAll(".pdfjs-highlight")
      if (highlights.length > 0) {
        const firstHighlight = highlights[0] as HTMLElement
        if (firstHighlight.offsetParent) {
          firstHighlight.scrollIntoView({ behavior: "smooth", block: "center" })
        }
      }
    } catch (err) {
      console.error("Error scrolling to highlight:", err)
    }
  }

  if (!tenantId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Please select a workspace</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-2">{error}</p>
          <button
            onClick={() => window.close()}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  if (!pdfUrl) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 size-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading PDF...</p>
        </div>
      </div>
    )
  }

  // Build viewer URL with PDF file parameter and page
  // PDF.js viewer accepts ?file= parameter for the PDF URL and #page= for page number
  // Use custom viewer that disables origin validation
  const viewerUrl = `/pdfjs/web/viewer-custom.html?file=${encodeURIComponent(pdfUrl)}${targetPage > 1 ? `#page=${targetPage}` : ""}`

  return (
    <div 
      className="fixed inset-0 flex flex-col bg-background" 
      style={{ 
        margin: 0, 
        padding: 0, 
        overflow: "hidden",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 9999
      }}
    >
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background">
          <div className="text-center">
            <Loader2 className="mx-auto mb-4 size-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading PDF viewer...</p>
          </div>
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={viewerUrl}
        className="border-0"
        style={{ 
          display: "block",
          opacity: loading ? 0 : 1,
          margin: 0,
          padding: 0,
          border: "none",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          flex: 1,
          pointerEvents: loading ? "none" : "auto"
        }}
        title="PDF Viewer"
        scrolling="no"
      />
    </div>
  )
}
