import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api, type ApiResponse } from "@/lib/api"

interface Folder {
  id: string
  name: string
  hasChildren?: boolean
  children?: Folder[]
}

interface FolderDetails {
  id: string
  name: string
  parentId: string | null
  path: string
  depth: number
  stats: {
    folderCount: number
    fileCount: number
  }
  createdAt: string
  updatedAt: string
}

interface CreateFolderRequest {
  name: string
  parentId: string | null
  tenantId: string
}

export function useFolders(parentId?: string | null, tenantId?: string, deleted?: boolean) {
  const params = new URLSearchParams()
  // Only pass parentId if it's actually set (not null/undefined)
  // When parentId is null/undefined, we're at root and only pass tenantId
  if (parentId) {
    params.append("parentId", parentId)
  }
  if (tenantId) params.append("tenantId", tenantId)
  if (deleted) params.append("deleted", "true")

  return useQuery({
    queryKey: ["folders", parentId, tenantId, deleted],
    queryFn: async (): Promise<ApiResponse<Folder[]>> => {
      const response = await api<any>(`/api/v1/folders?${params.toString()}`, {
        method: "GET",
      })
      // Unwrap nested data.data structure: API returns { data: { data: [...] } }
      // We need to extract the inner data array
      const folders = response.data?.data || response.data || []
      return {
        ...response,
        data: Array.isArray(folders) ? folders : [],
      }
    },
  })
}

export function useFolderDetails(folderId: string, tenantId?: string) {
  const params = new URLSearchParams()
  if (tenantId) params.append("tenantId", tenantId)

  return useQuery({
    queryKey: ["folder", folderId, tenantId],
    queryFn: async (): Promise<ApiResponse<FolderDetails>> => {
      return api<FolderDetails>(`/api/v1/folders/${folderId}?${params.toString()}`, {
        method: "GET",
      })
    },
    enabled: !!folderId,
  })
}

export function useCreateFolder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateFolderRequest): Promise<ApiResponse<{ id: string; path: string }>> => {
      return api("/api/v1/folders", {
        method: "POST",
        data,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] })
    },
  })
}

export function useRenameFolder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      folderId,
      name,
      tenantId,
    }: {
      folderId: string
      name: string
      tenantId?: string
    }): Promise<ApiResponse<{ id: string; name: string; path: string; updatedAt: string }>> => {
      const params = new URLSearchParams()
      if (tenantId) params.append("tenantId", tenantId)

      return api(`/api/v1/folders/${folderId}?${params.toString()}`, {
        method: "PATCH",
        data: { name },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] })
    },
  })
}

export function useDeleteFolders() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      folderIds,
      tenantId,
    }: {
      folderIds: string[]
      tenantId: string
    }): Promise<ApiResponse> => {
      return api("/api/v1/folders/delete", {
        method: "POST",
        data: { folderIds, tenantId },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] })
      queryClient.invalidateQueries({ queryKey: ["recycle-bin"] })
    },
  })
}

export function useMoveFolders() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      folderIds,
      targetParentId,
      tenantId,
    }: {
      folderIds: string[]
      targetParentId: string | null
      tenantId: string
    }): Promise<ApiResponse> => {
      return api("/api/v1/folders/move", {
        method: "POST",
        data: { folderIds, targetParentId, tenantId },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] })
    },
  })
}
