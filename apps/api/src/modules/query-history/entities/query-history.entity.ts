import { BaseEntity } from "src/core/database/entities/base.entity";
import { Entity, Column } from "typeorm";
import { QueryMode } from "../constants/query-mode.enum";

export interface DocumentUsed {
    fileId: string;
    fileName: string;
    pageNumber: number;
    chunkIndex?: number;
    score?: number;
}

export interface Citation {
    index: number;
    ref: string;
    snippet?: string;
}

@Entity({
    name: 'query_history'
})
export class QueryHistory extends BaseEntity {

    @Column({ name: 'tenant_id', type: 'uuid' })
    tenantId!: string;

    @Column({ name: 'user_id', type: 'uuid' })
    userId!: string;

    @Column({ name: 'query', type: 'text' })
    query!: string;

    @Column({
        name: 'query_mode',
        type: 'varchar',
        length: 32,
    })
    queryMode!: QueryMode;

    @Column({ name: 'confidence', type: 'varchar', length: 16, nullable: true })
    confidence!: string | null;

    @Column({ name: 'total_chunks_retrieved', type: 'int', default: 0 })
    totalChunksRetrieved!: number;

    @Column({ name: 'rerank_score', type: 'float', nullable: true })
    rerankScore!: number | null;

    @Column({ name: 'total_time_ms', type: 'int', default: 0 })
    totalTimeMs!: number;

    @Column({ name: 'documents_used', type: 'jsonb', nullable: true })
    documentsUsed!: DocumentUsed[] | null;

    @Column({ name: 'citations', type: 'jsonb', nullable: true })
    citations!: Citation[] | null;
}
