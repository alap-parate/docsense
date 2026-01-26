import { Expose } from "class-transformer";
import { IsOptional, IsUUID } from "class-validator";

export class DashboardQueryDto {
    @IsOptional()
    @IsUUID()
    tenantId?: string;
}

export class StorageStatsDto {
    @Expose()
    totalFiles!: number;

    @Expose()
    totalSizeBytes!: number;

    @Expose()
    filesByStatus!: {
        ready: number;
        processing: number;
        failed: number;
        pending: number;
    };
}

export class QueryStatsDto {
    @Expose()
    totalQueries!: number;

    @Expose()
    queriesLast7Days!: number;

    @Expose()
    queriesLast30Days!: number;

    @Expose()
    avgResponseTimeMs!: number;

    @Expose()
    queryModeDistribution!: {
        mode: string;
        count: number;
    }[];
}

export class RecentActivityDto {
    @Expose()
    recentUploads!: {
        id: string;
        name: string;
        status: string;
        createdAt: Date;
    }[];

    @Expose()
    recentQueries!: {
        id: string;
        query: string;
        queryMode: string;
        createdAt: Date;
    }[];
}

export class DashboardResponseDto {
    @Expose()
    storage!: StorageStatsDto;

    @Expose()
    queries!: QueryStatsDto;

    @Expose()
    activity!: RecentActivityDto;

    @Expose()
    workspaceCount!: number;
}
