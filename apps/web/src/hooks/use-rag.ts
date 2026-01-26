import { useMutation, useQueryClient } from "@tanstack/react-query"

interface RAGRequest {
  question: string
  tenantId: string
  folderId?: string
  topK?: number
  useHybridSearch?: boolean
}

interface RAGSource {
  fileId: string
  fileName: string
  pageNumber: number
  chunkIndex: number
  snippet: string
  score: number
}

interface RAGResponse {
  sources: RAGSource[]
  answer: string
  metadata?: {
    model: string
    usage: {
      promptTokens: number
      completionTokens: number
      totalTokens: number
    }
  }
}

/**
 * Hook for RAG streaming queries
 * Note: This uses fetch directly for SSE streaming, not the standard api helper
 */
export function useRAGAsk() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: RAGRequest): Promise<RAGResponse> => {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
      const { data: { session } } = await import("@/lib/supabase").then(m => m.supabase.auth.getSession())
      
      if (!session?.access_token) {
        throw new Error("No access token available")
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/rag/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(params),
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
      let sources: RAGSource[] = []
      let answer = ""
      let metadata: RAGResponse["metadata"] | undefined

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n\n")
        buffer = lines.pop() || ""

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]
          if (line.startsWith("event: ")) {
            const eventType = line.slice(7).trim()
            const dataLine = lines[i + 1]
            if (dataLine && dataLine.startsWith("data: ")) {
              const data = JSON.parse(dataLine.slice(6))

              if (eventType === "sources") {
                sources = data.sources || []
              } else if (eventType === "token") {
                answer += data.token || ""
              } else if (eventType === "done") {
                metadata = data.metadata
              } else if (eventType === "error") {
                throw new Error(data.error || "RAG request failed")
              }
            }
          }
        }
      }

      return { sources, answer, metadata }
    },
    onSuccess: () => {
      // Invalidate query history cache when RAG query completes
      queryClient.invalidateQueries({ queryKey: ["query-history"] })
    },
  })
}
