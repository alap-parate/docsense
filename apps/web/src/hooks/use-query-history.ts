import { useQuery } from "@tanstack/react-query"
import { api, type ApiResponse } from "@/lib/api"

export interface DocumentUsed {
  fileId: string
  fileName: string
  pageNumber: number
  chunkIndex: number
  score: number
}

export interface QueryHistoryItem {
  id: string
  tenantId: string
  tenantName: string
  userId: string
  query: string
  response: string | null
  aborted: boolean
  queryMode: "HYBRID" | "KEYWORD" | "RAG"
  confidence: "High" | "Medium" | "Low"
  totalChunksRetrieved: number
  rerankScore: number
  totalTimeMs: number
  documentsUsed: DocumentUsed[]
  citations: string | null
  createdAt: string
}

interface QueryHistoryResponse {
  data: QueryHistoryItem[]
  pagination: {
    page: number
    limit: number
    total: number
  }
}

export function useQueryHistory(page = 1, limit = 20) {
  const params = new URLSearchParams()
  params.append("page", page.toString())
  params.append("limit", limit.toString())

  return useQuery({
    queryKey: ["query-history", page, limit],
    queryFn: async (): Promise<ApiResponse<QueryHistoryResponse>> => {
      const response = await api<any>(`/api/v1/query-history?${params.toString()}`, {
        method: "GET",
      })
      // Handle nested data structure
      const data = response.data?.data || response.data || []
      const pagination = response.data?.pagination || response.meta?.pagination || {
        page,
        limit,
        total: Array.isArray(data) ? data.length : 0,
      }
      return {
        ...response,
        data: {
          data: Array.isArray(data) ? data : [],
          pagination,
        },
      }
    },
  })
}
