export enum ProcessingStage {
    PDF_SPLITTING = 'PDF_SPLITTING',
    SAVING_PAGES = 'SAVING_PAGES',
    EMBEDDING_GENERATION = 'EMBEDDING_GENERATION',
    INDEXING = 'INDEXING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
}

export interface StageTimings {
    pdfSplittingMs?: number;
    savingPagesMs?: number;
    embeddingMs?: number;
    indexingMs?: number;
}
