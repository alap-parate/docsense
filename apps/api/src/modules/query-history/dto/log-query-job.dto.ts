import { QueryMode } from '../constants/query-mode.enum';
import type { DocumentUsed, Citation } from '../entities/query-history.entity';

export interface LogQueryJobPayload {
    tenantId: string;
    userId: string;
    query: string;
    queryMode: QueryMode;
    confidence?: string | null;
    totalChunksRetrieved: number;
    rerankScore?: number | null;
    totalTimeMs: number;
    documentsUsed?: DocumentUsed[] | null;
    citations?: Citation[] | null;
}
