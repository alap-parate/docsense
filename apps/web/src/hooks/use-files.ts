import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api, type ApiResponse } from "@/lib/api"

interface File {
  id: string
  name: string
  status: "UPLOADED" | "PROCESSING" | "READY" | "FAILED"
  pages?: number
  createdAt: string
}

interface FileDetails {
  id: string
  name: string
  type: string
  mimeType: string
  size: number
  state: string
  processing: {
    status: string
    pages: number
    processedAt: string
    failedReason: string | null
  }
  folder: {
    id: string
    path: string
  }
  preview: {
    available: boolean
    pageCount: number
  }
  createdAt: string
  updatedAt: string
}

interface UploadRequest {
  fileName: string
  mimeType: string
  size: number
  folderId?: string
  tenantId: string
}

interface UploadResponse {
  fileId: string
  uploadUrl: string
  uploadHeaders: {
    "Content-Type": string
  }
}

interface DownloadResponse {
  url: string
  expiresIn: number
}

export function useFiles(folderId?: string | null, tenantId?: string, deleted?: boolean) {
  const params = new URLSearchParams()
  // Pass folderId if it's set, otherwise don't pass it (for root - only tenantId)
  if (folderId) {
    params.append("folderId", folderId)
  }
  if (tenantId) params.append("tenantId", tenantId)
  if (deleted) params.append("deleted", "true")

  return useQuery({
    queryKey: ["files", folderId, tenantId, deleted],
    queryFn: async (): Promise<ApiResponse<File[]>> => {
      const response = await api<any>(`/api/v1/files?${params.toString()}`, {
        method: "GET",
      })
      // Unwrap nested data.data structure: API returns { data: { data: [...] } }
      // We need to extract the inner data array
      const files = response.data?.data || response.data || []
      return {
        ...response,
        data: Array.isArray(files) ? files : [],
      }
    },
    enabled: !!tenantId, // Only require tenantId, folderId is optional
  })
}

export function useFileDetails(fileId: string, tenantId?: string) {
  const params = new URLSearchParams()
  if (tenantId) params.append("tenantId", tenantId)

  return useQuery({
    queryKey: ["file", fileId, tenantId],
    queryFn: async (): Promise<ApiResponse<FileDetails>> => {
      return api<FileDetails>(`/api/v1/files/${fileId}?${params.toString()}`, {
        method: "GET",
      })
    },
    enabled: !!fileId,
  })
}

export function useFileUploadRequest() {
  return useMutation({
    mutationFn: async (data: UploadRequest): Promise<ApiResponse<UploadResponse>> => {
      return api<UploadResponse>("/api/v1/files/upload-request", {
        method: "POST",
        data,
      })
    },
  })
}

export function useConfirmUpload() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      fileId,
      tenantId,
    }: {
      fileId: string
      tenantId: string
    }): Promise<ApiResponse<{ fileId: string; confirmed: boolean }>> => {
      return api(`/api/v1/files/${fileId}/confirm-upload`, {
        method: "POST",
        data: { tenantId },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] })
    },
  })
}

export function useFileDownload(fileId: string, tenantId?: string) {
  const params = new URLSearchParams()
  if (tenantId) params.append("tenantId", tenantId)

  return useQuery({
    queryKey: ["file-download", fileId, tenantId],
    queryFn: async (): Promise<ApiResponse<DownloadResponse>> => {
      return api<DownloadResponse>(`/api/v1/files/${fileId}/download?${params.toString()}`, {
        method: "GET",
      })
    },
    enabled: !!fileId,
  })
}

export function useDeleteFiles() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      fileIds,
      tenantId,
    }: {
      fileIds: string[]
      tenantId: string
    }): Promise<ApiResponse> => {
      return api("/api/v1/files/delete", {
        method: "POST",
        data: { fileIds, tenantId },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] })
      queryClient.invalidateQueries({ queryKey: ["recycle-bin"] })
    },
  })
}

export function useMoveFiles() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      ids,
      targetParentId,
      tenantId,
    }: {
      ids: string[]
      targetParentId: string | null
      tenantId: string
    }): Promise<ApiResponse> => {
      return api("/api/v1/files/move", {
        method: "POST",
        data: { ids, targetParentId, tenantId },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] })
      queryClient.invalidateQueries({ queryKey: ["folders"] })
    },
  })
}
