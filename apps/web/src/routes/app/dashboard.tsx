import { createFileRoute } from "@tanstack/react-router"
import {
  FileText,
  HardDrive,
  Search,
  LayoutGrid,
  TrendingUp,
  Clock,
  CheckCircle2,
  Loader2,
  AlertCircle,
  FileQuestion,
  Upload,
  MessageSquare,
  Zap,
  Activity,
} from "lucide-react"
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { useDashboard } from "@/hooks/use-dashboard"
import { useWorkspaceStore } from "@/store/workspace-store"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/app/dashboard")({
  component: DashboardPage,
})

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

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

const STATUS_COLORS = {
  ready: "#22c55e",
  processing: "#3b82f6",
  failed: "#ef4444",
  pending: "#f59e0b",
}

const STATUS_ICONS = {
  ready: CheckCircle2,
  processing: Loader2,
  failed: AlertCircle,
  pending: FileQuestion,
}

function DashboardPage() {
  const { currentWorkspace } = useWorkspaceStore()
  const tenantId = currentWorkspace?.id
  const { data, isLoading } = useDashboard(tenantId)

  const dashboardData = data?.data

  if (!tenantId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Please select a workspace to view dashboard</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Unable to load dashboard data</p>
      </div>
    )
  }

  const { storage, queries, activity, workspaceCount } = dashboardData

  // Prepare chart data
  const fileStatusData = Object.entries(storage.filesByStatus).map(([status, count]) => ({
    name: status,
    status: status.charAt(0).toUpperCase() + status.slice(1),
    value: count,
    fill: STATUS_COLORS[status as keyof typeof STATUS_COLORS],
  }))

  const queryModeData = queries.queryModeDistribution.map((item) => ({
    mode: item.mode,
    count: item.count,
    fill: item.mode === "HYBRID" ? "hsl(var(--chart-1))" : "hsl(var(--chart-2))",
  }))

  const totalStatusFiles = Object.values(storage.filesByStatus).reduce((a, b) => a + b, 0)

  // Chart configs for shadcn charts
  const fileStatusChartConfig = {
    value: { label: "Files" },
    ready: { label: "Ready", color: STATUS_COLORS.ready },
    processing: { label: "Processing", color: STATUS_COLORS.processing },
    failed: { label: "Failed", color: STATUS_COLORS.failed },
    pending: { label: "Pending", color: STATUS_COLORS.pending },
  } satisfies ChartConfig

  const queryModeChartConfig = {
    count: { label: "Queries" },
    HYBRID: { label: "Hybrid", color: "hsl(var(--chart-1))" },
    RAG: { label: "RAG", color: "hsl(var(--chart-2))" },
  } satisfies ChartConfig

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your DocSense workspace activity
        </p>
      </div>

      {/* Key Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="py-4">
          <CardContent className="flex items-center gap-4">
            <div className="rounded-lg bg-blue-500/10 p-3">
              <FileText className="size-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Documents</p>
              <p className="text-2xl font-bold">{storage.totalFiles}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="py-4">
          <CardContent className="flex items-center gap-4">
            <div className="rounded-lg bg-purple-500/10 p-3">
              <HardDrive className="size-6 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Storage Used</p>
              <p className="text-2xl font-bold">{formatBytes(storage.totalSizeBytes)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="py-4">
          <CardContent className="flex items-center gap-4">
            <div className="rounded-lg bg-green-500/10 p-3">
              <Search className="size-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Queries</p>
              <p className="text-2xl font-bold">{queries.totalQueries}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="py-4">
          <CardContent className="flex items-center gap-4">
            <div className="rounded-lg bg-orange-500/10 p-3">
              <LayoutGrid className="size-6 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Workspaces</p>
              <p className="text-2xl font-bold">{workspaceCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Query Stats Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="py-4">
          <CardContent className="flex items-center gap-4">
            <div className="rounded-lg bg-emerald-500/10 p-3">
              <TrendingUp className="size-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Queries (7 days)</p>
              <p className="text-2xl font-bold">{queries.queriesLast7Days}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="py-4">
          <CardContent className="flex items-center gap-4">
            <div className="rounded-lg bg-cyan-500/10 p-3">
              <Activity className="size-6 text-cyan-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Queries (30 days)</p>
              <p className="text-2xl font-bold">{queries.queriesLast30Days}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="py-4">
          <CardContent className="flex items-center gap-4">
            <div className="rounded-lg bg-amber-500/10 p-3">
              <Zap className="size-6 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Response Time</p>
              <p className="text-2xl font-bold">{(queries.avgResponseTimeMs / 1000).toFixed(2)}s</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* File Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-5" />
              Document Status
            </CardTitle>
            <CardDescription>
              Breakdown of documents by processing status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-8">
              {/* Pie Chart */}
              <ChartContainer config={fileStatusChartConfig} className="h-[180px] w-[180px]">
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Pie
                    data={fileStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="status"
                  >
                    {fileStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>

              {/* Legend with Progress */}
              <div className="flex-1 space-y-4">
                {Object.entries(storage.filesByStatus).map(([status, count]) => {
                  const Icon = STATUS_ICONS[status as keyof typeof STATUS_ICONS]
                  const color = STATUS_COLORS[status as keyof typeof STATUS_COLORS]
                  const percentage = totalStatusFiles > 0 ? (count / totalStatusFiles) * 100 : 0

                  return (
                    <div key={status} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Icon
                            className={cn(
                              "size-4",
                              status === "processing" && "animate-spin"
                            )}
                            style={{ color }}
                          />
                          <span className="capitalize">{status}</span>
                        </div>
                        <span className="font-medium">{count}</span>
                      </div>
                      <Progress
                        value={percentage}
                        className="h-2"
                        style={{
                          // @ts-ignore - CSS custom property
                          "--tw-progress-fill": color,
                        }}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Query Mode Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="size-5" />
              Query Modes
            </CardTitle>
            <CardDescription>
              Distribution of queries by search mode
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={queryModeChartConfig} className="h-[220px] w-full">
              <BarChart
                data={queryModeData}
                layout="vertical"
                margin={{ left: 0, right: 16 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  dataKey="mode"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  width={60}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Bar
                  dataKey="count"
                  radius={[0, 4, 4, 0]}
                  fill="hsl(var(--primary))"
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Uploads */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="size-5" />
              Recent Uploads
            </CardTitle>
            <CardDescription>
              Latest documents added to your workspace
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activity.recentUploads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileText className="size-10 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No recent uploads</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activity.recentUploads.map((upload) => {
                  const StatusIcon = STATUS_ICONS[upload.status.toLowerCase() as keyof typeof STATUS_ICONS] || FileText
                  const statusColor = STATUS_COLORS[upload.status.toLowerCase() as keyof typeof STATUS_COLORS] || "#6b7280"

                  return (
                    <div
                      key={upload.id}
                      className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                    >
                      <div
                        className="rounded-lg p-2"
                        style={{ backgroundColor: `${statusColor}15` }}
                      >
                        <FileText className="size-4" style={{ color: statusColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{upload.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <StatusIcon
                            className={cn(
                              "size-3",
                              upload.status === "PROCESSING" && "animate-spin"
                            )}
                            style={{ color: statusColor }}
                          />
                          <span className="capitalize">{upload.status.toLowerCase()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="size-3" />
                        {formatTimeAgo(upload.createdAt)}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Queries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="size-5" />
              Recent Queries
            </CardTitle>
            <CardDescription>
              Latest searches performed in your workspace
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activity.recentQueries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Search className="size-10 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No recent queries</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activity.recentQueries.map((query) => (
                  <div
                    key={query.id}
                    className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Search className="size-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm line-clamp-2">{query.query}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                          {query.queryMode}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                      <Clock className="size-3" />
                      {formatTimeAgo(query.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
