import * as React from "react"
import { Search, FileText, File, ExternalLink } from "lucide-react"
import { useSearch } from "@/hooks/use-search"
import { useWorkspaceStore } from "@/store/workspace-store"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import apiClient from "@/lib/api"
import { toast } from "sonner"

export function SearchPage() {
  const { currentWorkspace } = useWorkspaceStore()
  const tenantId = currentWorkspace?.id

  const [query, setQuery] = React.useState("")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedFolderId, setSelectedFolderId] = React.useState<string | undefined>(undefined)

  const { data: searchResults, isLoading, isFetching } = useSearch({
    q: searchQuery,
    folderId: selectedFolderId,
    tenantId,
    limit: 50,
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      setSearchQuery(query.trim())
    }
  }

  // Extract text inside <mark> tags, combining adjacent marks into phrases
  const extractMarkedTexts = (html: string): string[] => {
    const markedTexts: string[] = []
    const stopwords = new Set([
      "the", "and", "but", "or", "to", "of", "a", "an", "in", "on", "for",
      "is", "are", "was", "were", "be", "by", "as", "at", "it", "this", "that", "with", "from"
    ])

    const shouldKeep = (text: string) => {
      const normalized = text.toLowerCase()
      if (normalized.length >= 4 && !stopwords.has(normalized)) return true
      if (/\d/.test(text)) return true
      if (text.includes("-")) return true
      return false
    }

    // Capture sequences of adjacent <mark> tags, allowing punctuation like "-" between them
    const sequenceRegex = /<mark>.*?<\/mark>(?:\s*[-–—/]*\s*<mark>.*?<\/mark>)*/gi
    const sequences = html.match(sequenceRegex) || []

    for (const sequence of sequences) {
      const cleanText = sequence
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim()

      if (cleanText && shouldKeep(cleanText)) {
        markedTexts.push(cleanText)
      }
    }

    // Fallback: extract individual mark tags if no sequences found
    if (markedTexts.length === 0) {
      const regex = /<mark>(.*?)<\/mark>/gi
      let match
      while ((match = regex.exec(html)) !== null) {
        const cleanText = match[1].replace(/<[^>]*>/g, "").trim()
        if (cleanText && shouldKeep(cleanText)) {
          markedTexts.push(cleanText)
        }
      }
    }

    // De-duplicate while preserving order
    return Array.from(new Set(markedTexts))
  }

  const handleFileClick = async (fileId: string, pageNumber: number, snippet: string) => {
    if (!tenantId) return

    // Extract marked texts before navigation to avoid URL encoding issues
    const markedTexts = extractMarkedTexts(snippet)
    
    // Open PDF viewer in new tab as full page
    const params = new URLSearchParams()
    params.set("fileId", fileId)
    params.set("page", String(pageNumber))
    if (markedTexts.length > 0) {
      params.set("markedTexts", JSON.stringify(markedTexts))
    }
    const viewerUrl = `/app/pdf-viewer?${params.toString()}`
    window.open(viewerUrl, "_blank")
  }

  // Render snippet with mark tags for highlighting
  const renderSnippet = (snippet: string) => {
    // The snippet contains <mark> tags for highlighting
    // We need to render it as HTML
    return <span dangerouslySetInnerHTML={{ __html: snippet }} />
  }

  const matches = searchResults?.matches || []
  const total = searchResults?.total || 0

  if (!tenantId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Please select a workspace</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Search Documents</h1>
        <p className="text-muted-foreground">Search across all your documents using keyword search</p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search documents..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch(e)
                }
              }}
            />
          </div>
          <Button type="submit" disabled={!query.trim() || isLoading}>
            {isLoading || isFetching ? "Searching..." : "Search"}
          </Button>
        </div>
      </form>

      {/* Results */}
      {searchQuery && (
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <p className="text-muted-foreground">Searching...</p>
            </div>
          ) : matches.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2">
              <FileText className="size-8 text-muted-foreground" />
              <p className="text-muted-foreground">No results found for &quot;{searchQuery}&quot;</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Found {total} {total === 1 ? "result" : "results"} for &quot;{searchQuery}&quot;
                </p>
              </div>

              <div className="space-y-3">
                {matches.map((match, index) => (
                  <Card
                    key={`${match.fileId}-${match.pageNumber}-${index}`}
                    className="hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => handleFileClick(match.fileId, match.pageNumber, match.snippet)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2 text-base group">
                            <File className="size-4 text-muted-foreground" />
                            <span className="group-hover:text-primary transition-colors">{match.fileName}</span>
                            <ExternalLink className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </CardTitle>
                          <CardDescription className="mt-1">
                            Page {match.pageNumber}
                            {match.score && (
                              <Badge variant="outline" className="ml-2">
                                Score: {match.score.toFixed(2)}
                              </Badge>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed [&_mark]:bg-yellow-200 [&_mark]:dark:bg-yellow-900 [&_mark]:px-0.5 [&_mark]:rounded">
                        {renderSnippet(match.snippet)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!searchQuery && (
        <div className="flex h-32 flex-col items-center justify-center gap-2">
          <Search className="size-8 text-muted-foreground" />
          <p className="text-muted-foreground">Enter a search query to find documents</p>
        </div>
      )}
    </div>
  )
}
