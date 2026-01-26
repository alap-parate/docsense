import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { api, type ApiResponse } from "@/lib/api"

interface SearchMatch {
  fileId: string
  fileName: string
  pageNumber: number
  snippet: string
  score: number
}

interface SearchResponse {
  matches: SearchMatch[]
  total: number
  query: string
}

interface SearchParams {
  q: string
  folderId?: string
  tenantId?: string
  limit?: number
  offset?: number
}

export function useSearch(params: SearchParams) {
  const queryClient = useQueryClient()
  const searchParams = new URLSearchParams()
  searchParams.append("q", params.q)
  if (params.folderId) searchParams.append("folderId", params.folderId)
  if (params.tenantId) searchParams.append("tenantId", params.tenantId)
  if (params.limit) searchParams.append("limit", params.limit.toString())
  if (params.offset) searchParams.append("offset", params.offset.toString())

  const query = useQuery({
    queryKey: ["search", params],
    queryFn: async (): Promise<SearchResponse> => {
      const response = await api<any>(`/api/v1/search?${searchParams.toString()}`, {
        method: "GET",
      })
      // The search endpoint returns { data: { matches, total, query } }
      // Extract from nested data.data structure
      if (response.data) {
        // Check if nested in data.data
        if (typeof response.data === 'object' && 'data' in response.data) {
          const nested = response.data.data
          if (nested && 'matches' in nested && 'total' in nested) {
            return nested as SearchResponse
          }
        }
        // Check if it's already the SearchResponse shape
        if ('matches' in response.data && 'total' in response.data) {
          return response.data as SearchResponse
        }
      }
      return { matches: [], total: 0, query: params.q }
    },
    enabled: !!params.q && params.q.length > 0,
  })

  // Invalidate query history cache when search completes successfully
  useEffect(() => {
    if (query.isSuccess && query.data) {
      queryClient.invalidateQueries({ queryKey: ["query-history"] })
    }
  }, [query.isSuccess, query.data, queryClient])

  return query
}
