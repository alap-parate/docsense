import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api, type ApiResponse } from "@/lib/api"

export interface Workspace {
  id: string
  name: string
  status: string
  createdAt: string
  createdBy?: string
  createdByMail?: string
}

interface WorkspacesResponse {
  workspaces: Workspace[]
  pagination: {
    page: number
    limit: number
    total: number
  }
}

interface CreateWorkspaceRequest {
  name: string
}

interface CreateWorkspaceResponse {
  id: string
  name: string
  createdAt: string
}

export interface WorkspaceUser {
  userId: string
  name: string
  role: "OWNER" | "EDITOR" | "MEMBER" | "VIEWER"
  joinedDate: string
  // Optional fields for backward compatibility
  id?: string
  email?: string
  status?: string
  joinedAt?: string
}

interface WorkspaceUsersResponse {
  users: WorkspaceUser[]
  pagination: {
    page: number
    limit: number
    total: number
  }
}

interface InviteUserRequest {
  email: string
  tenantId: string
  role: "EDITOR" | "MEMBER" | "VIEWER"
}

interface InviteUserResponse {
  id: string
  email: string
  tenantId: string
  role: string
  status: string
  expiresAt: string
}

export function useWorkspaces(page = 1, limit = 10) {
  return useQuery({
    queryKey: ["workspaces", page, limit],
    queryFn: async (): Promise<ApiResponse<WorkspacesResponse>> => {
      return api<WorkspacesResponse>(`/api/v1/workspace?page=${page}&limit=${limit}`, {
        method: "GET",
      })
    },
  })
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateWorkspaceRequest): Promise<ApiResponse<CreateWorkspaceResponse>> => {
      return api<CreateWorkspaceResponse>("/api/v1/workspace", {
        method: "POST",
        data,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] })
    },
  })
}

export function useRenameWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      tenantId,
      name,
    }: {
      tenantId: string
      name: string
    }): Promise<ApiResponse<{ id: string; name: string; updatedAt: string }>> => {
      return api(`/api/v1/workspace/${tenantId}`, {
        method: "PATCH",
        data: { name },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] })
    },
  })
}

export function useWorkspaceUsers(workspaceId: string, page = 1, limit = 10, enabled = true) {
  return useQuery({
    queryKey: ["workspace-users", workspaceId, page, limit],
    queryFn: async (): Promise<ApiResponse<WorkspaceUsersResponse>> => {
      return api<WorkspaceUsersResponse>(
        `/api/v1/workspace/users?workspaceId=${workspaceId}&page=${page}&limit=${limit}`,
        {
          method: "GET",
        }
      )
    },
    enabled: !!workspaceId && enabled,
  })
}

export function useRemoveUserFromWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      tenantId,
      userId,
    }: {
      tenantId: string
      userId: string
    }): Promise<ApiResponse<{ userId: string; tenantId: string; state: string }>> => {
      return api(`/api/v1/workspace/${tenantId}/user/${userId}/remove`, {
        method: "POST",
      })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workspace-users", variables.tenantId] })
      queryClient.invalidateQueries({ queryKey: ["workspaces"] })
    },
  })
}

export function useChangeUserRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      tenantId,
      userId,
      role,
    }: {
      tenantId: string
      userId: string
      role: "EDITOR" | "MEMBER" | "VIEWER"
    }): Promise<ApiResponse<{ userId: string; tenantId: string; role: string; updatedAt: string }>> => {
      return api(`/api/v1/workspace/${tenantId}/user/${userId}/role`, {
        method: "POST",
        data: { role },
      })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workspace-users", variables.tenantId] })
    },
  })
}

export function useInviteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: InviteUserRequest): Promise<ApiResponse<InviteUserResponse>> => {
      return api<InviteUserResponse>("/api/v1/workspace/invite", {
        method: "POST",
        data,
      })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workspace-users", variables.tenantId] })
    },
  })
}

export interface Invitation {
  id: string
  email: string
  createdBy?: string
  createdByMail?: string
}

interface InvitationsResponse {
  invitations: Invitation[]
  pagination: {
    page: number
    limit: number
    total: number
  }
}

export function useWorkspaceInvitations(tenantId: string, page = 1, limit = 10, enabled = true) {
  return useQuery({
    queryKey: ["workspace-invitations", tenantId, page, limit],
    queryFn: async (): Promise<ApiResponse<InvitationsResponse>> => {
      return api<InvitationsResponse>(
        `/api/v1/workspace/${tenantId}/invitations?page=${page}&limit=${limit}`,
        {
          method: "GET",
        }
      )
    },
    enabled: !!tenantId && enabled,
  })
}

export function useRevokeInvitation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      invitationId,
      tenantId,
    }: {
      invitationId: string
      tenantId: string
    }): Promise<ApiResponse<{ id: string; status: string; revokedAt: string }>> => {
      return api(`/api/v1/workspace/invite/revoke/${invitationId}`, {
        method: "POST",
      })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workspace-invitations", variables.tenantId] })
      queryClient.invalidateQueries({ queryKey: ["workspace-users", variables.tenantId] })
      queryClient.invalidateQueries({ queryKey: ["workspaces"] })
    },
  })
}
