import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api, type ApiResponse } from "@/lib/api"

export interface RecycledItem {
  id: string
  type: "FOLDER" | "FILE"
  name: string
  originalParentId?: string
  originalFolderId?: string
  recycledAt: string
}

interface RecycleBinResponse {
  data: RecycledItem[]
  pagination: {
    page: number
    limit: number
    total: number
  }
}

interface RestoreResult {
  id: string
  type: "FILE" | "FOLDER"
  state: "ACTIVE" | "FAILED"
  parentId?: string | null
  error?: {
    code: string
  }
}

interface RestoreResponse {
  requested: number
  restored: number
  failed: number
  results: RestoreResult[]
}

interface PermanentDeleteResult {
  id: string
  state: "PURGED"
  purgedAt: string
}

interface PermanentDeleteResponse {
  id: string
  state: "PURGED"
  purgedAt: string
  results: PermanentDeleteResult[]
}

export function useRecycleBin(tenantId?: string, page = 1, limit = 50) {
  const params = new URLSearchParams()
  if (tenantId) params.append("tenantId", tenantId)
  params.append("page", page.toString())
  params.append("limit", limit.toString())

  return useQuery({
    queryKey: ["recycle-bin", tenantId, page, limit],
    queryFn: async (): Promise<ApiResponse<RecycleBinResponse>> => {
      const response = await api<any>(`/api/v1/recycle-bin?${params.toString()}`, {
        method: "GET",
      })
      // Handle nested data structure if present
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
    enabled: !!tenantId,
  })
}

export function useRestoreItems() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      ids,
      tenantId,
    }: {
      ids: string[]
      tenantId: string
    }): Promise<ApiResponse<RestoreResponse>> => {
      return api<RestoreResponse>("/api/v1/recycle-bin/restore", {
        method: "POST",
        data: { ids, tenantId },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recycle-bin"] })
      queryClient.invalidateQueries({ queryKey: ["files"] })
      queryClient.invalidateQueries({ queryKey: ["folders"] })
    },
  })
}

export function usePermanentDelete() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      ids,
      tenantId,
    }: {
      ids: string[]
      tenantId: string
    }): Promise<ApiResponse<PermanentDeleteResponse>> => {
      return api<PermanentDeleteResponse>("/api/v1/recycle-bin/permanent", {
        method: "DELETE",
        data: { ids, tenantId },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recycle-bin"] })
    },
  })
}
