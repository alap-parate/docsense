import { create } from "zustand"
import { persist } from "zustand/middleware"

interface Workspace {
  id: string
  name: string
  status: string
  createdAt: string
  createdBy?: string
  createdByMail?: string
}

interface WorkspaceState {
  currentWorkspaceId: string | null
  currentWorkspace: Workspace | null
  setCurrentWorkspace: (workspace: Workspace | null) => void
  clearWorkspace: () => void
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      currentWorkspaceId: null,
      currentWorkspace: null,
      setCurrentWorkspace: (workspace) =>
        set({
          currentWorkspace: workspace,
          currentWorkspaceId: workspace?.id ?? null,
        }),
      clearWorkspace: () =>
        set({
          currentWorkspace: null,
          currentWorkspaceId: null,
        }),
    }),
    {
      name: "workspace-storage",
    }
  )
)
