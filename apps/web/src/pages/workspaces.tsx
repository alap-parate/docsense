import * as React from "react"
import {
  Plus,
  Users,
  UserPlus,
  Edit,
  Trash2,
  MoreVertical,
  Building2,
  Mail,
  X,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useWorkspaceStore } from "@/store/workspace-store"
import {
  useWorkspaces,
  useCreateWorkspace,
  useRenameWorkspace,
  useWorkspaceUsers,
  useRemoveUserFromWorkspace,
  useChangeUserRole,
  useInviteUser,
  useWorkspaceInvitations,
  useRevokeInvitation,
  type Workspace,
  type WorkspaceUser,
  type Invitation,
} from "@/hooks/use-workspaces"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

function CreateWorkspaceDialog() {
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState("")
  const createWorkspace = useCreateWorkspace()
  const { setCurrentWorkspace } = useWorkspaceStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    try {
      const result = await createWorkspace.mutateAsync({ name: name.trim() })
      if (result.data) {
        setCurrentWorkspace({
          id: result.data.id,
          name: result.data.name,
          status: "ACTIVE",
          createdAt: result.data.createdAt,
        })
        toast.success("Workspace created successfully")
        setOpen(false)
        setName("")
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || "Failed to create workspace")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4 mr-2" />
          Create Workspace
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Workspace</DialogTitle>
          <DialogDescription>Create a new workspace for your team.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workspace-name">Workspace Name</Label>
              <Input
                id="workspace-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Inc"
                required
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createWorkspace.isPending}>
              {createWorkspace.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RenameWorkspaceDialog({ workspace }: { workspace: Workspace }) {
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState(workspace.name)
  const renameWorkspace = useRenameWorkspace()
  const { setCurrentWorkspace } = useWorkspaceStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || name.trim() === workspace.name) {
      setOpen(false)
      return
    }

    try {
      const result = await renameWorkspace.mutateAsync({
        tenantId: workspace.id,
        name: name.trim(),
      })
      if (result.data) {
        setCurrentWorkspace({
          ...workspace,
          name: result.data.name,
        })
        toast.success("Workspace renamed successfully")
        setOpen(false)
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || "Failed to rename workspace")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <Edit className="size-4 mr-2" />
          Rename workspace
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename Workspace</DialogTitle>
          <DialogDescription>Change the name of this workspace.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rename-workspace-name">Workspace Name</Label>
              <Input
                id="rename-workspace-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={renameWorkspace.isPending}>
              {renameWorkspace.isPending ? "Renaming..." : "Rename"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function InviteUserDialog({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = React.useState(false)
  const [email, setEmail] = React.useState("")
  const [role, setRole] = React.useState<"EDITOR" | "MEMBER" | "VIEWER">("MEMBER")
  const inviteUser = useInviteUser()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    try {
      await inviteUser.mutateAsync({
        email: email.trim(),
        tenantId: workspaceId,
        role,
      })
      toast.success("Invitation sent successfully")
      setOpen(false)
      setEmail("")
      setRole("MEMBER")
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || "Failed to send invitation")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserPlus className="size-4 mr-2" />
          Invite User
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
          <DialogDescription>Send an invitation to join this workspace.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EDITOR">Editor</SelectItem>
                  <SelectItem value="MEMBER">Member</SelectItem>
                  <SelectItem value="VIEWER">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={inviteUser.isPending}>
              {inviteUser.isPending ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ManageUsersDialog({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = React.useState(false)
  const { data: usersData, isLoading: usersLoading, isError: usersError } = useWorkspaceUsers(workspaceId, 1, 10, open)
  const { data: invitationsData, isLoading: invitationsLoading, isError: invitationsError } = useWorkspaceInvitations(workspaceId, 1, 10, open)
  const removeUser = useRemoveUserFromWorkspace()
  const changeRole = useChangeUserRole()
  const revokeInvitation = useRevokeInvitation()
  const { user: currentUser } = useAuth()

  const handleRemoveUser = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this user?")) return

    try {
      await removeUser.mutateAsync({ tenantId: workspaceId, userId })
      toast.success("User removed successfully")
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || "Failed to remove user")
    }
  }

  const handleChangeRole = async (userId: string, newRole: "EDITOR" | "MEMBER" | "VIEWER") => {
    try {
      await changeRole.mutateAsync({ tenantId: workspaceId, userId, role: newRole })
      toast.success("User role updated successfully")
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || "Failed to update user role")
    }
  }

  const handleRevokeInvitation = async (invitationId: string) => {
    if (!confirm("Are you sure you want to revoke this invitation?")) return

    try {
      await revokeInvitation.mutateAsync({ invitationId, tenantId: workspaceId })
      toast.success("Invitation revoked successfully")
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || "Failed to revoke invitation")
    }
  }

  const users = (usersData?.data?.users || [])
    .filter(
      (user): user is WorkspaceUser => user != null && (user.name != null || user.email != null)
    )
    .sort((a, b) => {
      // Put OWNER first, then sort others by name
      if (a.role === "OWNER" && b.role !== "OWNER") return -1
      if (a.role !== "OWNER" && b.role === "OWNER") return 1
      const nameA = (a.name || a.email || "").toLowerCase()
      const nameB = (b.name || b.email || "").toLowerCase()
      return nameA.localeCompare(nameB)
    })
  const invitations = (invitationsData?.data?.invitations || []).filter(
    (invitation): invitation is Invitation => invitation != null && invitation.email != null
  )

  const isLoading = usersLoading || invitationsLoading
  const isError = usersError || invitationsError

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Users className="size-4 mr-2" />
          Manage Users
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Workspace Users & Invitations</DialogTitle>
          <DialogDescription>Manage users, their roles, and pending invitations.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[500px] overflow-y-auto space-y-4">
          {isLoading ? (
            <p className="text-muted-foreground text-sm text-center py-8">Loading...</p>
          ) : isError ? (
            <p className="text-destructive text-sm text-center py-8">Failed to load data</p>
          ) : (
            <>
              {/* Active Users Section */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Active Users ({users.length})</h3>
                {users.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">No users found</p>
                ) : (
                  <div className="space-y-2">
                    {users.map((user: WorkspaceUser) => {
                      const userId = user.userId || user.id
                      if (!userId) return null
                      
                      const userName = user.name || user.email || "Unknown"
                      const userInitial = userName[0]?.toUpperCase() || "U"
                      const isOwner = user.role === "OWNER"
                      
                      return (
                      <div
                        key={userId}
                        className={cn(
                          "flex items-center justify-between p-3 border rounded-lg transition-colors",
                          isOwner && "bg-primary/5 border-primary/20 ring-1 ring-primary/10"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8">
                            <AvatarFallback>
                              {userInitial}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className={cn("text-sm font-medium", isOwner && "text-primary")}>
                                {userName}
                              </p>
                              {isOwner && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                                  Owner
                                </span>
                              )}
                            </div>
                            {!isOwner && (
                              <p className="text-xs text-muted-foreground">{user.role || "MEMBER"}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isOwner ? (
                            <div className="text-sm text-muted-foreground px-3 py-2">
                              Owner (cannot be changed)
                            </div>
                          ) : (
                            <Select
                              value={user.role === "OWNER" ? "MEMBER" : user.role}
                              onValueChange={(v) => handleChangeRole(userId, v as "EDITOR" | "MEMBER" | "VIEWER")}
                              disabled={userId === currentUser?.id}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="EDITOR">Editor</SelectItem>
                                <SelectItem value="MEMBER">Member</SelectItem>
                                <SelectItem value="VIEWER">Viewer</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          {userId !== currentUser?.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveUser(userId)}
                              disabled={removeUser.isPending}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                    })}
                  </div>
                )}
              </div>

              {/* Pending Invitations Section */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Pending Invitations ({invitations.length})</h3>
                {invitations.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">No pending invitations</p>
                ) : (
                  <div className="space-y-2">
                    {invitations.map((invitation: Invitation) => (
                      <div
                        key={invitation.id}
                        className="flex items-center justify-between p-3 border rounded-lg border-dashed bg-muted/30"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8">
                            <AvatarFallback>
                              <Mail className="size-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{invitation.email || "Unknown"}</p>
                            {invitation.createdBy && (
                              <p className="text-xs text-muted-foreground">
                                Invited by {invitation.createdBy}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRevokeInvitation(invitation.id)}
                          disabled={revokeInvitation.isPending}
                          title="Revoke invitation"
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function WorkspacesPage() {
  const { currentWorkspace, setCurrentWorkspace } = useWorkspaceStore()
  const { data: workspacesData, isLoading } = useWorkspaces()
  const workspaces = workspacesData?.data?.workspaces || []

  React.useEffect(() => {
    // Auto-select first workspace if none selected
    if (!currentWorkspace && workspaces.length > 0) {
      setCurrentWorkspace(workspaces[0])
    }
  }, [workspaces, currentWorkspace, setCurrentWorkspace])

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workspaces</h1>
          <p className="text-muted-foreground mt-1">
            Manage your workspaces and team members
          </p>
        </div>
        <CreateWorkspaceDialog />
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading workspaces...</p>
        </div>
      ) : workspaces.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="size-12 text-muted-foreground mb-4" />
            <CardTitle className="mb-2">No workspaces yet</CardTitle>
            <CardDescription className="mb-4">
              Create your first workspace to get started
            </CardDescription>
            <CreateWorkspaceDialog />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((workspace: Workspace) => (
            <Card
              key={workspace.id}
              className={cn(
                "transition-colors",
                currentWorkspace?.id === workspace.id && "ring-2 ring-primary"
              )}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="size-5" />
                      {workspace.name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {workspace.status}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <RenameWorkspaceDialog workspace={workspace} />
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {workspace.createdBy && (
                    <div className="text-sm text-muted-foreground">
                      Created by {workspace.createdBy}
                      {workspace.createdByMail && (
                        <span className="block text-xs mt-1">{workspace.createdByMail}</span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <ManageUsersDialog workspaceId={workspace.id} />
                    <InviteUserDialog workspaceId={workspace.id} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
