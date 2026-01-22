import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { QueryHistoryRepository } from '../repositories/query-history.repository';
import type { LogQueryJobPayload } from '../dto/log-query-job.dto';

@Processor('query-history-logging', { concurrency: 5 })
export class QueryHistoryWorker extends WorkerHost {
    private readonly logger = new Logger(QueryHistoryWorker.name);

    constructor(private readonly queryHistoryRepo: QueryHistoryRepository) {
        super();
    }

    async process(job: Job<LogQueryJobPayload>): Promise<void> {
        const payload = job.data;
        try {
            await this.queryHistoryRepo.insertFromPayload(payload);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.warn(`Query history log failed: ${msg}`);
            throw err;
        }
    }
}
