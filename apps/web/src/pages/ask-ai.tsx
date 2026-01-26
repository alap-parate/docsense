import * as React from "react"
import { Send, MessageCircle, FileText, Loader2, Sparkles } from "lucide-react"
import { useWorkspaceStore } from "@/store/workspace-store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

interface Source {
  fileId: string
  fileName: string
  pageNumber: number
  chunkIndex: number
  snippet: string
  score: number
}

export function AskAIPage() {
  const { currentWorkspace } = useWorkspaceStore()
  const tenantId = currentWorkspace?.id

  const [question, setQuestion] = React.useState("")
  const [answer, setAnswer] = React.useState("")
  const [sources, setSources] = React.useState<Source[]>([])
  const [metadata, setMetadata] = React.useState<any>(null)
  const [isStreaming, setIsStreaming] = React.useState(false)
  const [topK, setTopK] = React.useState<number>(3)
  const [useHybridSearch, setUseHybridSearch] = React.useState<boolean>(false)

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim() || !tenantId) return

    setAnswer("")
    setSources([])
    setMetadata(null)
    setIsStreaming(true)

    try {
      // Use the mutation but we'll handle streaming manually for better UX
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
      const { data: { session } } = await import("@/lib/supabase").then((m) => m.supabase.auth.getSession())

      if (!session?.access_token) {
        throw new Error("No access token available")
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/rag/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          question: question.trim(),
          tenantId,
          topK,
          useHybridSearch,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error("No response body")
      }

      const decoder = new TextDecoder()
      let buffer = ""
      let currentAnswer = ""
      let currentSources: Source[] = []
      let currentMetadata: any = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const blocks = buffer.split("\n\n")
        buffer = blocks.pop() || ""

        for (const block of blocks) {
          const lines = block.split("\n").filter(Boolean)
          const eventLine = lines.find((line) => line.startsWith("event: "))
          const dataLine = lines.find((line) => line.startsWith("data: "))

          if (!eventLine || !dataLine) continue

          const eventType = eventLine.slice(7).trim()
          try {
            const data = JSON.parse(dataLine.slice(6))

            if (eventType === "sources") {
              currentSources = data.sources || []
              setSources(currentSources)
            } else if (eventType === "token") {
              currentAnswer += data.token || ""
              setAnswer(currentAnswer)
            } else if (eventType === "done") {
              currentMetadata = data.metadata
              setMetadata(currentMetadata)
            } else if (eventType === "error") {
              throw new Error(data.error || "RAG request failed")
            }
          } catch (parseError) {
            console.error("Error parsing SSE data:", parseError)
          }
        }
      }
    } catch (error) {
      console.error("RAG error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to get AI response")
    } finally {
      setIsStreaming(false)
    }
  }

  const buildMarkedTexts = (snippet: string) => {
    const normalizedSnippet = snippet.replace(/\s+/g, " ").trim()
    if (!normalizedSnippet) return []

    const candidates = normalizedSnippet
      .split(/[.?!]\s+|\n+/)
      .map((part) => part.trim())
      .filter((part) => part.length >= 12)

    if (candidates.length > 0) {
      return candidates.slice(0, 3)
    }

    return [normalizedSnippet.slice(0, 120)]
  }

  const handleSourceClick = (fileId: string, pageNumber: number, snippet: string) => {
    const markedTexts = buildMarkedTexts(snippet)
    const params = new URLSearchParams()
    params.set("fileId", fileId)
    params.set("page", String(pageNumber))
    if (markedTexts.length > 0) {
      params.set("markedTexts", JSON.stringify(markedTexts))
    }
    const viewerUrl = `/app/pdf-viewer?${params.toString()}`
    window.open(viewerUrl, "_blank")
  }

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
        <h1 className="text-3xl font-bold">Ask AI</h1>
        <p className="text-muted-foreground">Ask questions about your documents using AI-powered search</p>
      </div>

      {/* Search Options */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Search Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Hybrid Search Toggle */}
          <div className="flex items-center gap-3">
            <Switch
              id="hybrid-search"
              checked={useHybridSearch}
              onCheckedChange={setUseHybridSearch}
              disabled={isStreaming}
            />
            <div className="flex-1">
              <Label htmlFor="hybrid-search" className="text-sm font-medium cursor-pointer">
                Hybrid Search
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Combines keyword and semantic search
              </p>
            </div>
          </div>

          {/* Result Depth Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="result-depth" className="text-sm font-medium">
                Result Depth
              </Label>
              <Badge variant="outline" className="text-sm font-semibold px-2 py-0.5">
                {topK}
              </Badge>
            </div>
            <div className="px-1">
              <Slider
                id="result-depth"
                min={0}
                max={2}
                step={1}
                value={[topK === 3 ? 0 : topK === 5 ? 1 : 2]}
                onValueChange={(value) => {
                  const depthMap = [3, 5, 10]
                  setTopK(depthMap[value[0]])
                }}
                disabled={isStreaming}
                className="w-full max-w-xs"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1 max-w-xs">
                <span>3</span>
                <span>5</span>
                <span>10</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Question Form */}
      <form onSubmit={handleAsk} className="space-y-4">
        <div className="space-y-2">
          <Textarea
            placeholder="Ask a question about your documents..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="min-h-[100px] resize-none"
            disabled={isStreaming}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                handleAsk(e)
              }
            }}
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Press Cmd/Ctrl + Enter to submit
            </p>
            <Button 
              type="submit" 
              disabled={!question.trim() || isStreaming}
              size="default"
              className="shrink-0"
            >
              {isStreaming ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                </>
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* Streaming Answer */}
      {(answer || isStreaming) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4" />
              Assistant
              {isStreaming && (
                <Badge variant="outline" className="text-xs font-normal">
                  Streaming
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <p className="whitespace-pre-wrap leading-relaxed">
                {answer || "Thinking..."}
                {isStreaming && (
                  <span className="inline-block h-4 w-1 animate-pulse bg-current align-text-bottom" />
                )}
              </p>
            </div>
            {metadata && (
              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                <span>Model: {metadata.model}</span>
                {metadata.usage && <span>Tokens: {metadata.usage.totalTokens}</span>}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sources */}
      {sources.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Sources</h2>
            <p className="text-sm text-muted-foreground">
              Based on {sources.length} {sources.length === 1 ? "document" : "documents"}
            </p>
          </div>
          <div className="space-y-3">
            {sources.map((source, index) => (
              <Card
                key={`${source.fileId}-${source.pageNumber}-${index}`}
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => handleSourceClick(source.fileId, source.pageNumber, source.snippet)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <FileText className="size-4 text-muted-foreground" />
                        {source.fileName}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Page {source.pageNumber}
                        {source.score && (
                          <Badge variant="outline" className="ml-2">
                            Score: {source.score.toFixed(2)}
                          </Badge>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{source.snippet}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!answer && !isStreaming && (
        <div className="flex h-32 flex-col items-center justify-center gap-2">
          <MessageCircle className="size-8 text-muted-foreground" />
          <p className="text-muted-foreground">Ask a question to get started</p>
        </div>
      )}
    </div>
  )
}
