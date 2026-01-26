import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QueryHistory } from '../entities/query-history.entity';
import type { LogQueryJobPayload } from '../dto/log-query-job.dto';

@Injectable()
export class QueryHistoryRepository {
    constructor(
        @InjectRepository(QueryHistory)
        private readonly repo: Repository<QueryHistory>,
    ) {}

    async insertFromPayload(payload: LogQueryJobPayload): Promise<void> {
        await this.repo.insert({
            tenantId: payload.tenantId,
            userId: payload.userId,
            query: payload.query,
            response: payload.response ?? null,
            aborted: payload.aborted ?? false,
            queryMode: payload.queryMode,
            confidence: payload.confidence ?? null,
            totalChunksRetrieved: payload.totalChunksRetrieved,
            rerankScore: payload.rerankScore ?? null,
            totalTimeMs: payload.totalTimeMs,
            documentsUsed: payload.documentsUsed ?? null,
            citations: payload.citations ?? null,
        });
    }

    async findRecentByUserId(
        userId: string,
        limit: number,
        offset: number,
    ): Promise<{ rows: QueryHistory[]; total: number }> {
        const [rows, total] = await this.repo.findAndCount({
            where: { userId },
            order: { createdAt: 'DESC' },
            take: limit,
            skip: offset,
            relations: ['tenant'],
        });
        return { rows, total };
    }
}
