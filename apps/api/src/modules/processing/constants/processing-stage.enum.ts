export enum ProcessingStage {
    PDF_SPLITTING = 'PDF_SPLITTING',
    SAVING_PAGES = 'SAVING_PAGES',
    CHUNKING = 'CHUNKING',
    EMBEDDING_GENERATION = 'EMBEDDING_GENERATION',
    INDEXING = 'INDEXING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
}

export interface StageTimings {
    pdfSplittingMs?: number;
    savingPagesMs?: number;
    chunkingMs?: number;
    embeddingMs?: number;
    indexingMs?: number;
}

export interface StageHistoryEntry {
    stage: ProcessingStage;
    startedAt: string;
    endedAt: string;
    durationMs: number;
}
