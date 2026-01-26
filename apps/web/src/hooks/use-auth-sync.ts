import { useMutation, useQueryClient } from "@tanstack/react-query"
import { api, type ApiResponse } from "@/lib/api"

interface AuthSyncResponse {
  id: string
  email: string
}

export function useAuthSync() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (): Promise<ApiResponse<AuthSyncResponse>> => {
      return api<AuthSyncResponse>("/api/v1/auth/sync", {
        method: "POST",
      })
    },
    onSuccess: () => {
      // Invalidate any relevant queries after sync
      queryClient.invalidateQueries()
    },
  })
}
