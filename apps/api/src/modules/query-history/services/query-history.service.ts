import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { LogQueryJobPayload } from '../dto/log-query-job.dto';
import { QueryHistoryRepository } from '../repositories/query-history.repository';
import { QueryHistory } from '../entities/query-history.entity';

@Injectable()
export class QueryHistoryService {
    private readonly logger = new Logger(QueryHistoryService.name);

    constructor(
        @InjectQueue('query-history-logging')
        private readonly logQueue: Queue,
        private readonly queryHistoryRepo: QueryHistoryRepository,
    ) {}

    /**
     * Enqueue a query log. Fire-and-forget: never awaits. Non-blocking.
     */
    logQuery(payload: LogQueryJobPayload): void {
        this.logQueue
            .add('log', payload, {
                removeOnComplete: { count: 1000 },
                removeOnFail: false,
            })
            .catch((err) => {
                const msg = err instanceof Error ? err.message : String(err);
                this.logger.warn(`Failed to enqueue query log: ${msg}`);
            });
    }

    async listQueryHistory(
        userId: string,
        limit: number,
        offset: number,
    ): Promise<{ data: QueryHistory[]; total: number }> {
        const { rows, total } = await this.queryHistoryRepo.findRecentByUserId(
            userId,
            limit,
            offset,
        );
        return { data: rows, total };
    }
}
