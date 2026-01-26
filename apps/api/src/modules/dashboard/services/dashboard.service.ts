import { Injectable, ForbiddenException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull, MoreThanOrEqual } from "typeorm";
import { Files, FileStatus } from "src/modules/storage/entities/files.entity";
import { QueryHistory } from "src/modules/query-history/entities/query-history.entity";
import { TenantUsers } from "src/modules/tenants/entities/tenant-users.entity";
import { TenantRepository } from "src/modules/tenants/repositories/tenant.repository";
import { DashboardResponseDto } from "../dto/dashboard.dto";

@Injectable()
export class DashboardService {
    constructor(
        @InjectRepository(Files)
        private readonly filesRepo: Repository<Files>,
        @InjectRepository(QueryHistory)
        private readonly queryHistoryRepo: Repository<QueryHistory>,
        @InjectRepository(TenantUsers)
        private readonly tenantUsersRepo: Repository<TenantUsers>,
        private readonly tenantRepo: TenantRepository,
    ) {}

    async getDashboard(
        userId: string,
        tenantIdInput: string | undefined
    ): Promise<DashboardResponseDto> {
        if (!tenantIdInput) {
            throw new ForbiddenException("Tenant ID is required");
        }

        // Verify user has access to this tenant
        const membership = await this.tenantRepo.findUser(userId, tenantIdInput);
        if (!membership) {
            throw new ForbiddenException("User does not have access to this tenant");
        }

        const [storage, queries, activity, workspaceCount] = await Promise.all([
            this.getStorageStats(tenantIdInput),
            this.getQueryStats(tenantIdInput),
            this.getRecentActivity(tenantIdInput),
            this.getWorkspaceCount(userId),
        ]);

        return {
            storage,
            queries,
            activity,
            workspaceCount,
        };
    }

    private async getStorageStats(tenantId: string) {
        const files = await this.filesRepo.find({
            where: { tenantId, deletedAt: IsNull() },
            select: ["id", "sizeBytes", "status"],
        });

        const totalFiles = files.length;
        const totalSizeBytes = files.reduce((sum, f) => sum + Number(f.sizeBytes), 0);

        const filesByStatus = {
            ready: files.filter((f) => f.status === FileStatus.READY).length,
            processing: files.filter((f) => f.status === FileStatus.PROCESSING).length,
            failed: files.filter((f) => f.status === FileStatus.FAILED).length,
            pending: files.filter(
                (f) => f.status === FileStatus.UPLOAD_PENDING || f.status === FileStatus.UPLOADED
            ).length,
        };

        return { totalFiles, totalSizeBytes, filesByStatus };
    }

    private async getQueryStats(tenantId: string) {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const [allQueries, last7DaysQueries, last30DaysQueries] = await Promise.all([
            this.queryHistoryRepo.find({
                where: { tenantId },
                select: ["id", "queryMode", "totalTimeMs"],
            }),
            this.queryHistoryRepo.count({
                where: { tenantId, createdAt: MoreThanOrEqual(sevenDaysAgo) },
            }),
            this.queryHistoryRepo.count({
                where: { tenantId, createdAt: MoreThanOrEqual(thirtyDaysAgo) },
            }),
        ]);

        const totalQueries = allQueries.length;
        const avgResponseTimeMs =
            totalQueries > 0
                ? Math.round(
                      allQueries.reduce((sum, q) => sum + q.totalTimeMs, 0) / totalQueries
                  )
                : 0;

        // Calculate query mode distribution
        const modeCount = new Map<string, number>();
        for (const q of allQueries) {
            modeCount.set(q.queryMode, (modeCount.get(q.queryMode) ?? 0) + 1);
        }
        const queryModeDistribution = Array.from(modeCount.entries()).map(([mode, count]) => ({
            mode,
            count,
        }));

        return {
            totalQueries,
            queriesLast7Days: last7DaysQueries,
            queriesLast30Days: last30DaysQueries,
            avgResponseTimeMs,
            queryModeDistribution,
        };
    }

    private async getRecentActivity(tenantId: string) {
        const [recentFiles, recentQueries] = await Promise.all([
            this.filesRepo.find({
                where: { tenantId, deletedAt: IsNull() },
                select: ["id", "name", "status", "createdAt"],
                order: { createdAt: "DESC" },
                take: 5,
            }),
            this.queryHistoryRepo.find({
                where: { tenantId },
                select: ["id", "query", "queryMode", "createdAt"],
                order: { createdAt: "DESC" },
                take: 5,
            }),
        ]);

        return {
            recentUploads: recentFiles.map((f) => ({
                id: f.id,
                name: f.name,
                status: f.status,
                createdAt: f.createdAt,
            })),
            recentQueries: recentQueries.map((q) => ({
                id: q.id,
                query: q.query.length > 100 ? q.query.substring(0, 100) + "..." : q.query,
                queryMode: q.queryMode,
                createdAt: q.createdAt,
            })),
        };
    }

    private async getWorkspaceCount(userId: string): Promise<number> {
        // Count workspaces (tenants) the user has access to
        return this.tenantUsersRepo.count({
            where: { userId, deletedAt: IsNull() },
        });
    }
}
