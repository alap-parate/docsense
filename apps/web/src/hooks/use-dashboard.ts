import { useQuery } from "@tanstack/react-query"
import { api, type ApiResponse } from "@/lib/api"

export interface DashboardData {
  storage: {
    totalFiles: number
    totalSizeBytes: number
    filesByStatus: {
      ready: number
      processing: number
      failed: number
      pending: number
    }
  }
  queries: {
    totalQueries: number
    queriesLast7Days: number
    queriesLast30Days: number
    avgResponseTimeMs: number
    queryModeDistribution: Array<{
      mode: string
      count: number
    }>
  }
  activity: {
    recentUploads: Array<{
      id: string
      name: string
      status: string
      createdAt: string
    }>
    recentQueries: Array<{
      id: string
      query: string
      queryMode: string
      createdAt: string
    }>
  }
  workspaceCount: number
}

export function useDashboard(tenantId?: string) {
  const params = new URLSearchParams()
  if (tenantId) params.append("tenantId", tenantId)

  return useQuery({
    queryKey: ["dashboard", tenantId],
    queryFn: async (): Promise<ApiResponse<DashboardData>> => {
      const response = await api<DashboardData>(`/api/v1/dashboard?${params.toString()}`, {
        method: "GET",
      })
      return response
    },
    enabled: !!tenantId,
    staleTime: 30000, // Consider data fresh for 30 seconds
  })
}
