import * as React from "react"
import {
  Folder,
  File,
  Download,
  Trash2,
  Move,
  Upload,
  FolderPlus,
  FileText,
  Home,
  RotateCcw,
  AlertTriangle,
} from "lucide-react"
import {
  useFolders,
  useCreateFolder,
  useRenameFolder,
  useDeleteFolders,
  useMoveFolders,
  useFolderDetails,
} from "@/hooks/use-folders"
import {
  useFiles,
  useFileUploadRequest,
  useConfirmUpload,
  useDeleteFiles,
  useMoveFiles,
  useFileDetails,
} from "@/hooks/use-files"
import {
  useRecycleBin,
  useRestoreItems,
  usePermanentDelete,
  type RecycledItem,
} from "@/hooks/use-recycle-bin"
import { useWorkspaceStore } from "@/store/workspace-store"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import apiClient from "@/lib/api"

interface FolderItem {
  id: string
  name: string
  type: "folder"
}

interface FileItem {
  id: string
  name: string
  status: "UPLOADED" | "PROCESSING" | "READY" | "FAILED"
  type: "file"
  pages?: number
  createdAt: string
}

type Item = FolderItem | FileItem

interface BreadcrumbItem {
  id: string | null
  name: string
}

export function DocumentsPage() {
  const { currentWorkspace } = useWorkspaceStore()
  const tenantId = currentWorkspace?.id

  const [activeTab, setActiveTab] = React.useState<"documents" | "recycle-bin">("documents")
  const [currentFolderId, setCurrentFolderId] = React.useState<string | null>(null)
  const [selectedItems, setSelectedItems] = React.useState<Set<string>>(new Set())
  const [lastSelectedIndex, setLastSelectedIndex] = React.useState<number | null>(null)
  const [breadcrumbs, setBreadcrumbs] = React.useState<BreadcrumbItem[]>([{ id: null, name: "Documents" }])
  const [isCreateFolderOpen, setIsCreateFolderOpen] = React.useState(false)
  const [newFolderName, setNewFolderName] = React.useState("")
  const [isRenameDialogOpen, setIsRenameDialogOpen] = React.useState(false)
  const [renameItem, setRenameItem] = React.useState<{ id: string; name: string; type: "folder" | "file" } | null>(null)
  const [renameValue, setRenameValue] = React.useState("")
  const [isMoveDialogOpen, setIsMoveDialogOpen] = React.useState(false)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = React.useState(false)
  const [detailsItem, setDetailsItem] = React.useState<Item | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const folderInputRef = React.useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = React.useState(false)

  // Recycle bin state
  const [selectedRecycleItems, setSelectedRecycleItems] = React.useState<Set<string>>(new Set())
  const [lastSelectedRecycleIndex, setLastSelectedRecycleIndex] = React.useState<number | null>(null)
  const [isPermanentDeleteDialogOpen, setIsPermanentDeleteDialogOpen] = React.useState(false)
  const [recycleBinFolderId, setRecycleBinFolderId] = React.useState<string | null>(null)
  const [recycleBinBreadcrumbs, setRecycleBinBreadcrumbs] = React.useState<BreadcrumbItem[]>([{ id: null, name: "Recycle Bin" }])

  // Step 1: When at root, list folders with only tenantId
  const { data: rootFoldersData, isLoading: rootFoldersLoading } = useFolders(
    undefined, // No parentId when at root - only pass tenantId
    tenantId
  )

  // Step 2: When inside a folder, list child folders using parentId
  const { data: foldersData, isLoading: foldersLoading } = useFolders(
    currentFolderId || undefined, // Only pass parentId when inside a folder
    tenantId
  )

  // Step 3: List files
  // At root: only pass tenantId (no folderId)
  // Inside folder: pass both folderId and tenantId
  const { data: filesData, isLoading: filesLoading } = useFiles(
    currentFolderId || undefined, // Only pass folderId when inside a folder
    tenantId
  )

  // Extract folders from response
  // When at root, show root folders from rootFoldersData (initial call with only tenantId)
  // When inside a folder, show child folders from foldersData (with parentId)
  const folders = React.useMemo(() => {
    if (currentFolderId === null) {
      return Array.isArray(rootFoldersData?.data) ? rootFoldersData.data : []
    }
    return Array.isArray(foldersData?.data) ? foldersData.data : []
  }, [currentFolderId, rootFoldersData, foldersData])

  // Extract files from response
  const files = Array.isArray(filesData?.data) ? filesData.data : []

  const isLoading = currentFolderId === null 
    ? rootFoldersLoading || filesLoading 
    : foldersLoading || filesLoading

  const createFolder = useCreateFolder()
  const renameFolder = useRenameFolder()
  const deleteFolders = useDeleteFolders()
  const moveFolders = useMoveFolders()
  const deleteFiles = useDeleteFiles()
  const moveFiles = useMoveFiles()
  const uploadRequest = useFileUploadRequest()
  const confirmUpload = useConfirmUpload()
  const folderDetailsQuery = useFolderDetails(
    detailsItem?.type === "folder" ? detailsItem.id : "",
    tenantId
  )
  const fileDetailsQuery = useFileDetails(
    detailsItem?.type === "file" ? detailsItem.id : "",
    tenantId
  )

  // Recycle bin hooks
  const { data: recycleBinData, isLoading: recycleBinLoading } = useRecycleBin(tenantId)
  const restoreItems = useRestoreItems()
  const permanentDelete = usePermanentDelete()

  // Deleted folders/files queries for browsing inside recycle bin
  const { data: deletedFoldersData, isLoading: deletedFoldersLoading } = useFolders(
    recycleBinFolderId || undefined,
    tenantId,
    true // deleted=true
  )
  const { data: deletedFilesData, isLoading: deletedFilesLoading } = useFiles(
    recycleBinFolderId || undefined,
    tenantId,
    true // deleted=true
  )

  const recycledItems = recycleBinData?.data?.data || []
  const recycleBinPagination = recycleBinData?.data?.pagination

  // When browsing inside a deleted folder, show its contents
  const deletedFolders = Array.isArray(deletedFoldersData?.data) ? deletedFoldersData.data : []
  const deletedFiles = Array.isArray(deletedFilesData?.data) ? deletedFilesData.data : []

  // Combined items for recycle bin view
  const recycleBinItems: (RecycledItem | Item)[] = React.useMemo(() => {
    if (recycleBinFolderId === null) {
      // At root of recycle bin - show recycled items from recycle-bin API
      return recycledItems
    }
    // Inside a deleted folder - show its contents
    const folderItems: FolderItem[] = deletedFolders.map((f) => ({
      id: f.id,
      name: f.name,
      type: "folder" as const,
    }))
    const fileItems: FileItem[] = deletedFiles.map((f) => ({
      id: f.id,
      name: f.name,
      status: f.status,
      type: "file" as const,
      pages: f.pages,
      createdAt: f.createdAt,
    }))
    return [...folderItems, ...fileItems]
  }, [recycleBinFolderId, recycledItems, deletedFolders, deletedFiles])

  const isRecycleBinLoading = recycleBinFolderId === null
    ? recycleBinLoading
    : deletedFoldersLoading || deletedFilesLoading

  // Build items list: folders first, then files
  const items: Item[] = React.useMemo(() => {
    const folderItems: FolderItem[] = folders.map((f) => ({
      id: f.id,
      name: f.name,
      type: "folder" as const,
    }))
    const fileItems: FileItem[] = files.map((f) => ({
      id: f.id,
      name: f.name,
      status: f.status,
      type: "file" as const,
      pages: f.pages,
      createdAt: f.createdAt,
    }))
    return [...folderItems, ...fileItems]
  }, [folders, files])

  // Navigate to folder
  const navigateToFolder = React.useCallback((folderId: string | null, folderName: string) => {
    setCurrentFolderId(folderId)
    setSelectedItems(new Set())
    setLastSelectedIndex(null)

    // Update breadcrumbs
    if (folderId === null) {
      setBreadcrumbs([{ id: null, name: "Documents" }])
    } else {
      setBreadcrumbs((prev) => {
        const index = prev.findIndex((b) => b.id === folderId)
        if (index >= 0) {
          return prev.slice(0, index + 1)
        }
        return [...prev, { id: folderId, name: folderName }]
      })
    }
  }, [])

  // Handle breadcrumb click
  const handleBreadcrumbClick = (item: BreadcrumbItem) => {
    if (item.id === null) {
      setBreadcrumbs([{ id: null, name: "Documents" }])
      setCurrentFolderId(null)
    } else {
      const index = breadcrumbs.findIndex((b) => b.id === item.id)
      if (index >= 0) {
        setBreadcrumbs(breadcrumbs.slice(0, index + 1))
        setCurrentFolderId(item.id)
      }
    }
    setSelectedItems(new Set())
  }

  // Selection handlers
  const handleItemClick = (e: React.MouseEvent, item: Item, index: number) => {
    // Prevent text selection during shift-click
    if (e.shiftKey) {
      e.preventDefault()
    }

    if (e.shiftKey && lastSelectedIndex !== null) {
      // Shift-click: select range
      const start = Math.min(lastSelectedIndex, index)
      const end = Math.max(lastSelectedIndex, index)
      const newSelected = new Set(selectedItems)
      for (let i = start; i <= end; i++) {
        newSelected.add(items[i].id)
      }
      setSelectedItems(newSelected)
    } else if (e.ctrlKey || e.metaKey) {
      // Ctrl/Cmd-click: toggle selection
      const newSelected = new Set(selectedItems)
      if (newSelected.has(item.id)) {
        newSelected.delete(item.id)
      } else {
        newSelected.add(item.id)
      }
      setSelectedItems(newSelected)
      setLastSelectedIndex(index)
    } else {
      // Regular click: single selection (folders require double-click to navigate)
      setSelectedItems(new Set([item.id]))
      setLastSelectedIndex(index)
    }
  }

  // Handle double-click for folder navigation
  const handleItemDoubleClick = (e: React.MouseEvent, item: Item) => {
    e.preventDefault()
    if (item.type === "folder") {
      navigateToFolder(item.id, item.name)
    }
  }

  const handleSelectAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(items.map((item) => item.id)))
    }
  }

  // Create folder
  const handleCreateFolder = async () => {
    if (!tenantId || !newFolderName.trim()) return

    try {
      const result = await createFolder.mutateAsync({
        name: newFolderName.trim(),
        parentId: currentFolderId,
        tenantId,
      })
      if (result.error) {
        toast.error(result.error.message || "Failed to create folder")
      } else {
        toast.success("Folder created successfully")
        setIsCreateFolderOpen(false)
        setNewFolderName("")
      }
    } catch (error) {
      toast.error("Failed to create folder")
    }
  }

  // Rename folder
  const handleRename = async () => {
    if (!tenantId || !renameItem || !renameValue.trim()) return

    try {
      if (renameItem.type === "folder") {
        const result = await renameFolder.mutateAsync({
          folderId: renameItem.id,
          name: renameValue.trim(),
          tenantId,
        })
        if (result.error) {
          toast.error(result.error.message || "Failed to rename folder")
        } else {
          toast.success("Folder renamed successfully")
          setIsRenameDialogOpen(false)
          setRenameItem(null)
          setRenameValue("")
        }
      }
      // File rename not supported in API
    } catch (error) {
      toast.error("Failed to rename")
    }
  }

  // Delete items
  const handleDelete = async () => {
    if (!tenantId) return

    const selectedFolders: string[] = []
    const selectedFiles: string[] = []

    selectedItems.forEach((id) => {
      const item = items.find((i) => i.id === id)
      if (item?.type === "folder") {
        selectedFolders.push(id)
      } else if (item?.type === "file") {
        selectedFiles.push(id)
      }
    })

    try {
      const promises: Promise<any>[] = []
      if (selectedFolders.length > 0) {
        promises.push(deleteFolders.mutateAsync({ folderIds: selectedFolders, tenantId }))
      }
      if (selectedFiles.length > 0) {
        promises.push(deleteFiles.mutateAsync({ fileIds: selectedFiles, tenantId }))
      }

      await Promise.all(promises)
      toast.success("Items moved to trash")
      setSelectedItems(new Set())
    } catch (error) {
      toast.error("Failed to delete items")
    }
  }

  // Download items
  const handleDownload = async () => {
    if (!tenantId) return

    const selectedFiles = Array.from(selectedItems).filter((id) => {
      const item = items.find((i) => i.id === id)
      return item?.type === "file"
    })

    for (const fileId of selectedFiles) {
      try {
        const response = await apiClient.get(`/api/v1/files/${fileId}/download?tenantId=${tenantId}`)
        if (response.data?.data?.url) {
          window.open(response.data.data.url, "_blank")
        } else {
          toast.error("Failed to get download URL")
        }
      } catch (error) {
        toast.error("Failed to download file")
      }
    }
  }

  // Move items
  const handleMove = async (targetParentId: string | null) => {
    if (!tenantId) return

    const selectedFolders: string[] = []
    const selectedFiles: string[] = []

    selectedItems.forEach((id) => {
      const item = items.find((i) => i.id === id)
      if (item?.type === "folder") {
        selectedFolders.push(id)
      } else if (item?.type === "file") {
        selectedFiles.push(id)
      }
    })

    try {
      const promises: Promise<any>[] = []
      if (selectedFolders.length > 0) {
        promises.push(moveFolders.mutateAsync({ folderIds: selectedFolders, targetParentId, tenantId }))
      }
      if (selectedFiles.length > 0) {
        promises.push(moveFiles.mutateAsync({ ids: selectedFiles, targetParentId, tenantId }))
      }

      await Promise.all(promises)
      toast.success("Items moved successfully")
      setSelectedItems(new Set())
      setIsMoveDialogOpen(false)
    } catch (error) {
      toast.error("Failed to move items")
    }
  }

  // File upload
  const handleFileUpload = async (fileList: FileList | null) => {
    if (!fileList || !tenantId) return

    for (const file of Array.from(fileList)) {
      try {
        // Request upload URL
        const uploadResult = await uploadRequest.mutateAsync({
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
          folderId: currentFolderId || undefined,
          tenantId,
        })

        if (uploadResult.error) {
          toast.error(`Failed to upload ${file.name}: ${uploadResult.error.message}`)
          continue
        }

        const { fileId, uploadUrl, uploadHeaders } = uploadResult.data!

        // Upload to S3
        await fetch(uploadUrl, {
          method: "PUT",
          headers: uploadHeaders,
          body: file,
        })

        // Confirm upload
        await confirmUpload.mutateAsync({ fileId, tenantId })
        toast.success(`${file.name} uploaded successfully`)
      } catch (error) {
        toast.error(`Failed to upload ${file.name}`)
      }
    }
  }

  // Drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileUpload(files)
    }
  }

  // Recycle bin handlers
  const handleRecycleItemClick = (e: React.MouseEvent, item: RecycledItem | Item, index: number) => {
    if (e.shiftKey) {
      e.preventDefault()
    }

    if (e.shiftKey && lastSelectedRecycleIndex !== null) {
      const start = Math.min(lastSelectedRecycleIndex, index)
      const end = Math.max(lastSelectedRecycleIndex, index)
      const newSelected = new Set(selectedRecycleItems)
      for (let i = start; i <= end; i++) {
        newSelected.add(recycleBinItems[i].id)
      }
      setSelectedRecycleItems(newSelected)
    } else if (e.ctrlKey || e.metaKey) {
      const newSelected = new Set(selectedRecycleItems)
      if (newSelected.has(item.id)) {
        newSelected.delete(item.id)
      } else {
        newSelected.add(item.id)
      }
      setSelectedRecycleItems(newSelected)
      setLastSelectedRecycleIndex(index)
    } else {
      setSelectedRecycleItems(new Set([item.id]))
      setLastSelectedRecycleIndex(index)
    }
  }

  const handleSelectAllRecycle = () => {
    if (selectedRecycleItems.size === recycleBinItems.length) {
      setSelectedRecycleItems(new Set())
    } else {
      setSelectedRecycleItems(new Set(recycleBinItems.map((item) => item.id)))
    }
  }

  // Navigate into a deleted folder
  const navigateToDeletedFolder = React.useCallback((folderId: string | null, folderName: string) => {
    setRecycleBinFolderId(folderId)
    setSelectedRecycleItems(new Set())
    setLastSelectedRecycleIndex(null)

    if (folderId === null) {
      setRecycleBinBreadcrumbs([{ id: null, name: "Recycle Bin" }])
    } else {
      setRecycleBinBreadcrumbs((prev) => {
        const index = prev.findIndex((b) => b.id === folderId)
        if (index >= 0) {
          return prev.slice(0, index + 1)
        }
        return [...prev, { id: folderId, name: folderName }]
      })
    }
  }, [])

  // Handle double-click on recycle bin folder
  const handleRecycleItemDoubleClick = (e: React.MouseEvent, item: RecycledItem | Item) => {
    e.preventDefault()
    const itemType = 'type' in item ? item.type : null
    if (itemType === "folder" || itemType === "FOLDER") {
      navigateToDeletedFolder(item.id, item.name)
    }
  }

  // Handle recycle bin breadcrumb click
  const handleRecycleBinBreadcrumbClick = (crumb: BreadcrumbItem) => {
    if (crumb.id === null) {
      setRecycleBinBreadcrumbs([{ id: null, name: "Recycle Bin" }])
      setRecycleBinFolderId(null)
    } else {
      const index = recycleBinBreadcrumbs.findIndex((b) => b.id === crumb.id)
      if (index >= 0) {
        setRecycleBinBreadcrumbs(recycleBinBreadcrumbs.slice(0, index + 1))
        setRecycleBinFolderId(crumb.id)
      }
    }
    setSelectedRecycleItems(new Set())
  }

  const handleRestore = async (ids?: string[]) => {
    if (!tenantId) return

    const itemsToRestore = ids || Array.from(selectedRecycleItems)
    if (itemsToRestore.length === 0) return

    try {
      const result = await restoreItems.mutateAsync({
        ids: itemsToRestore,
        tenantId,
      })

      if (result.error) {
        toast.error(result.error.message || "Failed to restore items")
      } else {
        const restored = result.data?.restored || 0
        const failed = result.data?.failed || 0
        if (failed > 0) {
          toast.warning(`Restored ${restored} item(s), ${failed} failed`)
        } else {
          toast.success(`Restored ${restored} item(s) successfully`)
        }
        setSelectedRecycleItems(new Set())
      }
    } catch (error) {
      toast.error("Failed to restore items")
    }
  }

  const handlePermanentDelete = async (ids?: string[]) => {
    if (!tenantId) return

    const itemsToDelete = ids || Array.from(selectedRecycleItems)
    if (itemsToDelete.length === 0) return

    try {
      const result = await permanentDelete.mutateAsync({
        ids: itemsToDelete,
        tenantId,
      })

      if (result.error) {
        toast.error(result.error.message || "Failed to permanently delete items")
      } else {
        toast.success("Items permanently deleted")
        setSelectedRecycleItems(new Set())
        setIsPermanentDeleteDialogOpen(false)
      }
    } catch (error) {
      toast.error("Failed to permanently delete items")
    }
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value as "documents" | "recycle-bin")
    setSelectedItems(new Set())
    setSelectedRecycleItems(new Set())
    setLastSelectedIndex(null)
    setLastSelectedRecycleIndex(null)
    // Reset recycle bin navigation when switching tabs
    if (value === "recycle-bin") {
      setRecycleBinFolderId(null)
      setRecycleBinBreadcrumbs([{ id: null, name: "Recycle Bin" }])
    }
  }

  const selectedFolders = Array.from(selectedItems).filter((id) => {
    const item = items.find((i) => i.id === id)
    return item?.type === "folder"
  })
  const selectedFiles = Array.from(selectedItems).filter((id) => {
    const item = items.find((i) => i.id === id)
    return item?.type === "file"
  })
  const hasSelection = selectedItems.size > 0
  const isSingleFolderSelected = selectedItems.size === 1 && selectedFolders.length === 1
  const hasSelectedFiles = selectedFiles.length > 0
  const isMultiSelection = selectedItems.size > 1
  const folderDetails = folderDetailsQuery.data?.data || null
  const fileDetails = fileDetailsQuery.data?.data || null
  const isDetailsLoading =
    detailsItem?.type === "folder" ? folderDetailsQuery.isLoading : fileDetailsQuery.isLoading

  const hasRecycleSelection = selectedRecycleItems.size > 0

  if (!tenantId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Please select a workspace</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex h-full flex-col">
        <div className="mb-4 flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="documents" className="gap-2">
              <FileText className="size-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="recycle-bin" className="gap-2">
              <Trash2 className="size-4" />
              Recycle Bin
              {recycledItems.length > 0 && (
                <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                  {recycledItems.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="documents" className="flex-1 mt-0">
          <div
            className="flex h-full flex-col"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Breadcrumb */}
            <div className="mb-4">
              <Breadcrumb>
                <BreadcrumbList>
                  {breadcrumbs.map((crumb, index) => (
                    <React.Fragment key={crumb.id || "root"}>
                      <BreadcrumbItem>
                        {index === breadcrumbs.length - 1 ? (
                          <BreadcrumbPage>{crumb.name}</BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink
                            onClick={() => handleBreadcrumbClick(crumb)}
                            className="cursor-pointer"
                          >
                            {index === 0 ? <Home className="size-4" /> : crumb.name}
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                      {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
                    </React.Fragment>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            </div>

      {/* Toolbar */}
      {hasSelection && (
        <div className="mb-4 flex items-center gap-2 border-b pb-4">
          <span className="text-sm text-muted-foreground">
            {selectedItems.size} {selectedItems.size === 1 ? "item" : "items"} selected
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="size-4" />
              Download
            </Button>
            <Button variant="outline" size="sm" onClick={handleDelete}>
              <Trash2 className="size-4" />
              Move to Trash
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsMoveDialogOpen(true)}>
              <Move className="size-4" />
              Move
            </Button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!hasSelection && (
        <div className="mb-4 flex items-center gap-2">
          <Button onClick={() => setIsCreateFolderOpen(true)}>
            <FolderPlus className="size-4" />
            New Folder
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="size-4" />
            Upload Files
          </Button>
          <Button variant="outline" onClick={() => folderInputRef.current?.click()}>
            <Upload className="size-4" />
            Upload Folder
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
          />
          <input
            ref={folderInputRef}
            type="file"
            webkitdirectory=""
            multiple
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
          />
        </div>
      )}

      {/* List view */}
      <div
        className={cn(
          "flex-1 overflow-auto rounded-lg border",
          isDragging && "border-primary bg-primary/5"
        )}
      >
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center gap-2">
            <FileText className="size-8 text-muted-foreground" />
            <p className="text-muted-foreground">No items in this folder</p>
          </div>
        ) : (
          <div className="divide-y">
            {/* Header */}
            <div className="flex items-center gap-4 border-b bg-muted/50 px-4 py-2 text-sm font-medium">
              <div className="w-12">
                <Checkbox
                  checked={selectedItems.size === items.length && items.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </div>
              <div className="flex-1">Name</div>
              <div className="w-32">Status</div>
              <div className="w-32">Modified</div>
            </div>

            {/* Items */}
            {items.map((item, index) => (
              <ContextMenu key={item.id}>
                <ContextMenuTrigger asChild>
                  <div
                    className={cn(
                      "flex items-center gap-4 px-4 py-2 hover:bg-accent cursor-pointer select-none",
                      selectedItems.has(item.id) && "bg-accent"
                    )}
                    onClick={(e) => handleItemClick(e, item, index)}
                    onDoubleClick={(e) => handleItemDoubleClick(e, item)}
                    onContextMenu={() => {
                      if (!selectedItems.has(item.id)) {
                        setSelectedItems(new Set([item.id]))
                        setLastSelectedIndex(index)
                      }
                    }}
                    onMouseDown={(e) => {
                      // Prevent text selection on shift-click
                      if (e.shiftKey) {
                        e.preventDefault()
                      }
                    }}
                  >
                    <div className="w-12">
                      <Checkbox
                        checked={selectedItems.has(item.id)}
                        onCheckedChange={(checked) => {
                          const newSelected = new Set(selectedItems)
                          if (checked) {
                            newSelected.add(item.id)
                          } else {
                            newSelected.delete(item.id)
                          }
                          setSelectedItems(newSelected)
                          setLastSelectedIndex(index)
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="flex flex-1 items-center gap-2">
                      {item.type === "folder" ? (
                        <Folder className="size-5 text-blue-500" />
                      ) : (
                        <File className="size-5 text-muted-foreground" />
                      )}
                      <span>{item.name}</span>
                    </div>
                    <div className="w-32 text-sm text-muted-foreground">
                      {item.type === "file" ? item.status : "-"}
                    </div>
                    <div className="w-32 text-sm text-muted-foreground">
                      {item.type === "file" && item.createdAt
                        ? new Date(item.createdAt).toLocaleDateString()
                        : "-"}
                    </div>
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  {isMultiSelection && selectedItems.has(item.id) ? (
                    <>
                      <ContextMenuItem disabled={!hasSelectedFiles} onClick={handleDownload}>
                        <Download className="size-4" />
                        Download
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem onClick={() => setIsMoveDialogOpen(true)}>
                        <Move className="size-4" />
                        Move
                      </ContextMenuItem>
                      <ContextMenuItem variant="destructive" onClick={handleDelete}>
                        <Trash2 className="size-4" />
                        Move to Trash
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem disabled>
                        Details
                      </ContextMenuItem>
                    </>
                  ) : (
                    <>
                      {item.type === "file" && (
                        <>
                          <ContextMenuItem
                            onClick={async () => {
                              // Download single file
                              try {
                                const response = await apiClient.get(
                                  `/api/v1/files/${item.id}/download?tenantId=${tenantId}`
                                )
                                if (response.data?.data?.url) {
                                  window.open(response.data.data.url, "_blank")
                                } else {
                                  toast.error("Failed to get download URL")
                                }
                              } catch (error) {
                                toast.error("Failed to download file")
                              }
                            }}
                          >
                            <Download className="size-4" />
                            Download
                          </ContextMenuItem>
                          <ContextMenuSeparator />
                        </>
                      )}
                      {item.type === "folder" && isSingleFolderSelected && (
                        <>
                          <ContextMenuItem
                            onClick={() => {
                              setRenameItem({ id: item.id, name: item.name, type: "folder" })
                              setRenameValue(item.name)
                              setIsRenameDialogOpen(true)
                            }}
                          >
                            Rename
                          </ContextMenuItem>
                          <ContextMenuSeparator />
                        </>
                      )}
                      <ContextMenuItem
                        onClick={() => {
                          setDetailsItem(item)
                          setIsDetailsDialogOpen(true)
                        }}
                      >
                        Details
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        onClick={() => {
                          setSelectedItems(new Set([item.id]))
                          setIsMoveDialogOpen(true)
                        }}
                      >
                        <Move className="size-4" />
                        Move
                      </ContextMenuItem>
                      <ContextMenuItem
                        variant="destructive"
                        onClick={async () => {
                          if (item.type === "folder") {
                            await deleteFolders.mutateAsync({
                              folderIds: [item.id],
                              tenantId: tenantId!,
                            })
                          } else {
                            await deleteFiles.mutateAsync({ fileIds: [item.id], tenantId: tenantId! })
                          }
                          toast.success("Item moved to trash")
                        }}
                      >
                        <Trash2 className="size-4" />
                        Delete
                      </ContextMenuItem>
                    </>
                  )}
                </ContextMenuContent>
              </ContextMenu>
            ))}
          </div>
        )}
      </div>
          </div>
        </TabsContent>

        <TabsContent value="recycle-bin" className="flex-1 mt-0">
          <div className="flex h-full flex-col">
            {/* Recycle Bin Breadcrumb */}
            <div className="mb-4">
              <Breadcrumb>
                <BreadcrumbList>
                  {recycleBinBreadcrumbs.map((crumb, index) => (
                    <React.Fragment key={crumb.id || "recycle-root"}>
                      <BreadcrumbItem>
                        {index === recycleBinBreadcrumbs.length - 1 ? (
                          <BreadcrumbPage>{crumb.name}</BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink
                            onClick={() => handleRecycleBinBreadcrumbClick(crumb)}
                            className="cursor-pointer"
                          >
                            {index === 0 ? <Trash2 className="size-4" /> : crumb.name}
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                      {index < recycleBinBreadcrumbs.length - 1 && <BreadcrumbSeparator />}
                    </React.Fragment>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            {/* Recycle Bin Toolbar */}
            {hasRecycleSelection && (
              <div className="mb-4 flex items-center gap-2 border-b pb-4">
                <span className="text-sm text-muted-foreground">
                  {selectedRecycleItems.size} {selectedRecycleItems.size === 1 ? "item" : "items"} selected
                </span>
                <div className="ml-auto flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRestore()}
                    disabled={restoreItems.isPending}
                  >
                    <RotateCcw className="size-4" />
                    Restore
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setIsPermanentDeleteDialogOpen(true)}
                    disabled={permanentDelete.isPending}
                  >
                    <Trash2 className="size-4" />
                    Delete Permanently
                  </Button>
                </div>
              </div>
            )}

            {/* Recycle Bin List */}
            <div className="flex-1 overflow-auto rounded-lg border">
              {isRecycleBinLoading ? (
                <div className="flex h-32 items-center justify-center">
                  <p className="text-muted-foreground">Loading...</p>
                </div>
              ) : recycleBinItems.length === 0 ? (
                <div className="flex h-32 flex-col items-center justify-center gap-2">
                  <Trash2 className="size-8 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {recycleBinFolderId === null ? "Recycle bin is empty" : "This folder is empty"}
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {/* Header */}
                  <div className="flex items-center gap-4 border-b bg-muted/50 px-4 py-2 text-sm font-medium">
                    <div className="w-12">
                      <Checkbox
                        checked={selectedRecycleItems.size === recycleBinItems.length && recycleBinItems.length > 0}
                        onCheckedChange={handleSelectAllRecycle}
                      />
                    </div>
                    <div className="flex-1">Name</div>
                    <div className="w-32">Type</div>
                    <div className="w-40">{recycleBinFolderId === null ? "Deleted" : "Modified"}</div>
                  </div>

                  {/* Items */}
                  {recycleBinItems.map((item, index) => {
                    // Determine item type - handles both RecycledItem (type: "FOLDER"/"FILE") and Item (type: "folder"/"file")
                    const itemType = 'type' in item ? item.type : null
                    const isFolder = itemType === "FOLDER" || itemType === "folder"
                    const displayType = isFolder ? "Folder" : "File"
                    // Get date - recycledAt for RecycledItem, createdAt for FileItem
                    const itemDate = 'recycledAt' in item ? item.recycledAt : ('createdAt' in item ? item.createdAt : null)

                    return (
                      <ContextMenu key={item.id}>
                        <ContextMenuTrigger asChild>
                          <div
                            className={cn(
                              "flex items-center gap-4 px-4 py-2 hover:bg-accent cursor-pointer select-none",
                              selectedRecycleItems.has(item.id) && "bg-accent"
                            )}
                            onClick={(e) => handleRecycleItemClick(e, item, index)}
                            onDoubleClick={(e) => handleRecycleItemDoubleClick(e, item)}
                            onContextMenu={() => {
                              if (!selectedRecycleItems.has(item.id)) {
                                setSelectedRecycleItems(new Set([item.id]))
                                setLastSelectedRecycleIndex(index)
                              }
                            }}
                            onMouseDown={(e) => {
                              if (e.shiftKey) {
                                e.preventDefault()
                              }
                            }}
                          >
                            <div className="w-12">
                              <Checkbox
                                checked={selectedRecycleItems.has(item.id)}
                                onCheckedChange={(checked) => {
                                  const newSelected = new Set(selectedRecycleItems)
                                  if (checked) {
                                    newSelected.add(item.id)
                                  } else {
                                    newSelected.delete(item.id)
                                  }
                                  setSelectedRecycleItems(newSelected)
                                  setLastSelectedRecycleIndex(index)
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                            <div className="flex flex-1 items-center gap-2">
                              {isFolder ? (
                                <Folder className="size-5 text-blue-500 opacity-60" />
                              ) : (
                                <File className="size-5 text-muted-foreground opacity-60" />
                              )}
                              <span className="text-muted-foreground">{item.name}</span>
                            </div>
                            <div className="w-32 text-sm text-muted-foreground">
                              {displayType}
                            </div>
                            <div className="w-40 text-sm text-muted-foreground">
                              {itemDate ? new Date(itemDate).toLocaleDateString() : "-"}
                            </div>
                          </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          {isFolder && (
                            <>
                              <ContextMenuItem onClick={() => navigateToDeletedFolder(item.id, item.name)}>
                                <Folder className="size-4" />
                                Open
                              </ContextMenuItem>
                              <ContextMenuSeparator />
                            </>
                          )}
                          <ContextMenuItem onClick={() => handleRestore([item.id])}>
                            <RotateCcw className="size-4" />
                            Restore
                          </ContextMenuItem>
                          <ContextMenuSeparator />
                          <ContextMenuItem
                            variant="destructive"
                            onClick={() => {
                              setSelectedRecycleItems(new Set([item.id]))
                              setIsPermanentDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className="size-4" />
                            Delete Permanently
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    )
                  })}
                </div>
              )}
            </div>

            {recycleBinFolderId === null && recycleBinPagination && recycleBinPagination.total > 0 && (
              <div className="mt-4 text-sm text-muted-foreground text-center">
                {recycleBinPagination.total} item(s) in recycle bin
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Folder Dialog */}
      <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>Enter a name for the new folder</DialogDescription>
          </DialogHeader>
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder name"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleCreateFolder()
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateFolderOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
            <DialogDescription>Enter a new name for the folder</DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="Folder name"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleRename()
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={!renameValue.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Dialog */}
      <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Items</DialogTitle>
            <DialogDescription>Select a destination folder</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                handleMove(null)
              }}
            >
              <Home className="size-4 mr-2" />
              Documents (Root)
            </Button>
            {/* In a real app, you'd show a folder tree here */}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMoveDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Details</DialogTitle>
          </DialogHeader>
          {detailsItem && (
            <div className="space-y-2">
              {isDetailsLoading ? (
                <p className="text-muted-foreground">Loading details...</p>
              ) : detailsItem.type === "folder" ? (
                <>
                  <div>
                    <span className="font-medium">Name:</span> {folderDetails?.name || detailsItem.name}
                  </div>
                  <div>
                    <span className="font-medium">Path:</span> {folderDetails?.path || "—"}
                  </div>
                  <div>
                    <span className="font-medium">Depth:</span>{" "}
                    {folderDetails?.depth ?? "—"}
                  </div>
                  <div>
                    <span className="font-medium">Folders:</span>{" "}
                    {folderDetails?.stats?.folderCount ?? "—"}
                  </div>
                  <div>
                    <span className="font-medium">Files:</span>{" "}
                    {folderDetails?.stats?.fileCount ?? "—"}
                  </div>
                  <div>
                    <span className="font-medium">Created:</span>{" "}
                    {folderDetails?.createdAt
                      ? new Date(folderDetails.createdAt).toLocaleString()
                      : "—"}
                  </div>
                  <div>
                    <span className="font-medium">Updated:</span>{" "}
                    {folderDetails?.updatedAt
                      ? new Date(folderDetails.updatedAt).toLocaleString()
                      : "—"}
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <span className="font-medium">Name:</span> {fileDetails?.name || detailsItem.name}
                  </div>
                  <div>
                    <span className="font-medium">Type:</span> {fileDetails?.type || "File"}
                  </div>
                  <div>
                    <span className="font-medium">MIME:</span> {fileDetails?.mimeType || "—"}
                  </div>
                  <div>
                    <span className="font-medium">Size:</span>{" "}
                    {fileDetails?.size ? `${(fileDetails.size / 1024 / 1024).toFixed(2)} MB` : "—"}
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>{" "}
                    {fileDetails?.processing?.status || fileDetails?.state || detailsItem.status}
                  </div>
                  <div>
                    <span className="font-medium">Pages:</span>{" "}
                    {fileDetails?.processing?.pages ?? detailsItem.pages ?? "—"}
                  </div>
                  <div>
                    <span className="font-medium">Folder:</span> {fileDetails?.folder?.path || "—"}
                  </div>
                  <div>
                    <span className="font-medium">Created:</span>{" "}
                    {fileDetails?.createdAt
                      ? new Date(fileDetails.createdAt).toLocaleString()
                      : "—"}
                  </div>
                  <div>
                    <span className="font-medium">Updated:</span>{" "}
                    {fileDetails?.updatedAt
                      ? new Date(fileDetails.updatedAt).toLocaleString()
                      : "—"}
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permanent Delete Confirmation Dialog */}
      <AlertDialog open={isPermanentDeleteDialogOpen} onOpenChange={setIsPermanentDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" />
              Permanently Delete Items?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete{" "}
              <strong>{selectedRecycleItems.size}</strong>{" "}
              {selectedRecycleItems.size === 1 ? "item" : "items"} from the system.
              All data associated with these items will be lost forever.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => handlePermanentDelete()}
              disabled={permanentDelete.isPending}
            >
              {permanentDelete.isPending ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
