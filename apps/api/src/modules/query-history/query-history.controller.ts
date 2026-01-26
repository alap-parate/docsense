import { Controller, Get, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from 'src/core/auth/guards/auth-guard';
import { CurrentUser } from 'src/shared/decorators/current-user.decorator';
import type { AuthUser } from 'src/shared/types/auth-user.type';
import { QueryHistoryService } from './services/query-history.service';
import { PaginationQueryDto } from 'src/shared/dto/pagination-query.dto';

@Controller({ version: '1', path: 'query-history' })
@UseGuards(AuthGuard)
export class QueryHistoryController {
    constructor(private readonly queryHistoryService: QueryHistoryService) {}

    @Get()
    @HttpCode(HttpStatus.OK)
    async list(
        @Query() query: PaginationQueryDto,
        @CurrentUser() user: AuthUser,
    ) {
        const limit = Math.min(Math.max(query.limit, 1), 100);
        const offset = (query.page - 1) * limit;
        const { data, total } = await this.queryHistoryService.listQueryHistory(
            user.id,
            limit,
            offset,
        );
        return {
            data: data.map((item) => ({
                id: item.id,
                tenantId: item.tenantId,
                tenantName: item.tenant?.name ?? null,
                query: item.query,
                response: item.response ?? null,
                aborted: item.aborted ?? false,
                queryMode: item.queryMode,
                confidence: item.confidence,
                totalChunksRetrieved: item.totalChunksRetrieved,
                rerankScore: item.rerankScore,
                totalTimeMs: item.totalTimeMs,
                documentsUsed: item.documentsUsed,
                citations: item.citations,
                createdAt: item.createdAt,
            })),
            pagination: {
                page: query.page,
                limit,
                total,
            },
        };
    }
}
