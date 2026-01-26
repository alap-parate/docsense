import * as React from "react"
import { createFileRoute } from "@tanstack/react-router"
import {
  History,
  Search,
  Clock,
  FileText,
  Zap,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessageSquare,
  TrendingUp,
  Layers,
  Timer,
  ExternalLink,
} from "lucide-react"
import { useQueryHistory, type QueryHistoryItem } from "@/hooks/use-query-history"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/app/query-history")({
  component: QueryHistoryPage,
})

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString()
}

const QUERY_MODE_COLORS = {
  HYBRID: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  KEYWORD: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  RAG: "bg-green-500/10 text-green-600 dark:text-green-400",
}

const CONFIDENCE_COLORS = {
  High: "bg-green-500/10 text-green-600 dark:text-green-400",
  Medium: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  Low: "bg-red-500/10 text-red-600 dark:text-red-400",
}

function QueryHistoryPage() {
  const [page, setPage] = React.useState(1)
  const [limit, setLimit] = React.useState(10)
  const [selectedQuery, setSelectedQuery] = React.useState<QueryHistoryItem | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false)

  const { data, isLoading } = useQueryHistory(page, limit)

  const queries = data?.data?.data || []
  const pagination = data?.data?.pagination

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 0

  const handleViewDetails = (query: QueryHistoryItem) => {
    setSelectedQuery(query)
    setIsDetailsOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <History className="size-8" />
            Query History
          </h1>
          <p className="text-muted-foreground">
            View and analyze your past searches and AI queries
          </p>
        </div>
      </div>

      {/* Stats Summary */}
      {pagination && pagination.total > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="py-4">
            <CardContent className="flex items-center gap-4">
              <div className="rounded-lg bg-primary/10 p-3">
                <MessageSquare className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Queries</p>
                <p className="text-2xl font-bold">{pagination.total}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="py-4">
            <CardContent className="flex items-center gap-4">
              <div className="rounded-lg bg-purple-500/10 p-3">
                <Zap className="size-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hybrid Queries</p>
                <p className="text-2xl font-bold">
                  {queries.filter((q) => q.queryMode === "HYBRID").length}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="py-4">
            <CardContent className="flex items-center gap-4">
              <div className="rounded-lg bg-blue-500/10 p-3">
                <Search className="size-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Keyword Queries</p>
                <p className="text-2xl font-bold">
                  {queries.filter((q) => q.queryMode === "KEYWORD").length}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="py-4">
            <CardContent className="flex items-center gap-4">
              <div className="rounded-lg bg-green-500/10 p-3">
                <TrendingUp className="size-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">RAG Queries</p>
                <p className="text-2xl font-bold">
                  {queries.filter((q) => q.queryMode === "RAG").length}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Query List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Search History</CardTitle>
              <CardDescription>
                All queries performed in this workspace
              </CardDescription>
            </div>
            <Select
              value={limit.toString()}
              onValueChange={(value) => {
                setLimit(Number(value))
                setPage(1)
              }}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 per page</SelectItem>
                <SelectItem value="20">20 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : queries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <History className="size-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No queries yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Your search and AI query history will appear here
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[35%]">Query</TableHead>
                      <TableHead>Workspace</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Chunks</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {queries.map((query) => (
                      <TableRow key={query.id} className="group">
                        <TableCell>
                          <div className="flex items-start gap-2">
                            <Search className="size-4 mt-0.5 text-muted-foreground shrink-0" />
                            <span className="line-clamp-2">{query.query}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground truncate max-w-[120px] block">
                            {query.tenantName}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "font-medium",
                              QUERY_MODE_COLORS[query.queryMode]
                            )}
                          >
                            {query.queryMode}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "font-medium",
                              CONFIDENCE_COLORS[query.confidence]
                            )}
                          >
                            {query.confidence}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Timer className="size-3" />
                            {query.totalTimeMs}ms
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <FileText className="size-3" />
                            {query.documentsUsed?.length || 0}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="size-3" />
                            {formatTimeAgo(query.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(query)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <ExternalLink className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {(page - 1) * limit + 1} to{" "}
                    {Math.min(page * limit, pagination?.total || 0)} of{" "}
                    {pagination?.total || 0} queries
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="size-4" />
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground px-2">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Query Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="size-5" />
              Query Details
            </DialogTitle>
            <DialogDescription>
              Detailed information about this query
            </DialogDescription>
          </DialogHeader>

          {selectedQuery && (
            <div className="space-y-6">
              {/* Query Text */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Query</h4>
                <p className="text-base bg-muted/50 rounded-lg p-3">
                  {selectedQuery.query}
                </p>
              </div>

              {/* Response */}
              {selectedQuery.response && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Response</h4>
                  <div className="text-sm bg-muted/50 rounded-lg p-3 max-h-[200px] overflow-y-auto whitespace-pre-wrap">
                    {selectedQuery.response}
                  </div>
                </div>
              )}

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-muted-foreground">Workspace</h4>
                  <p className="font-medium">{selectedQuery.tenantName}</p>
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-muted-foreground">Mode</h4>
                  <Badge
                    variant="secondary"
                    className={cn("font-medium", QUERY_MODE_COLORS[selectedQuery.queryMode])}
                  >
                    {selectedQuery.queryMode}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-muted-foreground">Confidence</h4>
                  <Badge
                    variant="secondary"
                    className={cn("font-medium", CONFIDENCE_COLORS[selectedQuery.confidence])}
                  >
                    {selectedQuery.confidence}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-muted-foreground">Response Time</h4>
                  <p className="flex items-center gap-1">
                    <Timer className="size-4 text-muted-foreground" />
                    {selectedQuery.totalTimeMs}ms
                  </p>
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-muted-foreground">Chunks Retrieved</h4>
                  <p className="flex items-center gap-1">
                    <Layers className="size-4 text-muted-foreground" />
                    {selectedQuery.totalChunksRetrieved}
                  </p>
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-muted-foreground">Rerank Score</h4>
                  <p className="flex items-center gap-1">
                    <TrendingUp className="size-4 text-muted-foreground" />
                    {selectedQuery.rerankScore?.toFixed(3) || 0}
                  </p>
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-muted-foreground">Date</h4>
                  <p className="flex items-center gap-1">
                    <Clock className="size-4 text-muted-foreground" />
                    {formatDate(selectedQuery.createdAt)}
                  </p>
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
                  {selectedQuery.aborted ? (
                    <Badge variant="secondary" className="bg-red-500/10 text-red-600 dark:text-red-400 font-medium">
                      Aborted
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-400 font-medium">
                      Completed
                    </Badge>
                  )}
                </div>
              </div>

              {/* Documents Used */}
              {selectedQuery.documentsUsed && selectedQuery.documentsUsed.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Documents Used ({selectedQuery.documentsUsed.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedQuery.documentsUsed.map((doc) => (
                      <div
                        key={`${doc.fileId}-${doc.pageNumber}-${doc.chunkIndex}`}
                        className="flex items-center justify-between bg-muted/50 rounded-lg p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-primary/10 p-2">
                            <FileText className="size-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{doc.fileName}</p>
                            <p className="text-xs text-muted-foreground">
                              Page {doc.pageNumber} • Chunk {doc.chunkIndex}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {(doc.score).toFixed(1)}
                          </p>
                          <p className="text-xs text-muted-foreground">relevance</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
