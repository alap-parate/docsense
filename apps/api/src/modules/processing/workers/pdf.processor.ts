import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DocumentsService } from "src/modules/documents/services/documents.service";
import { PdfExtractorService } from "../services/pdf-extractor.service";
import { EsIndexerService } from "../services/es-indexer.service";
import { StorageService } from "src/modules/storage/services/storage.service";
import { FileStatus } from "src/modules/storage/entities/files.entity";
import { ProcessingJobs, JobStatus } from "../entities/processing-job.entity";
import {
    ProcessingStage,
    type StageTimings,
} from "../constants/processing-stage.enum";

export interface ProcessPdfJob {
    fileId: string;
    tenantId: string;
    s3Key: string;
    mimeType: 'application/pdf';
}

export interface ProcessingProgress {
    processedPages: number;
    totalPages: number;
    percent: number;
    stage?: string;
    stageTimings?: StageTimings;
}

const PDF_PROCESSING_CONCURRENCY = parseInt(process.env.PDF_PROCESSING_CONCURRENCY || '3', 10);

@Processor('pdf-processing', {
    concurrency: PDF_PROCESSING_CONCURRENCY,
})
export class pdfProcessor extends WorkerHost {
    private readonly logger = new Logger(pdfProcessor.name);

    constructor(
        private readonly pdfExtractor: PdfExtractorService,
        private readonly esIndexer: EsIndexerService,
        private readonly documentsService: DocumentsService,
        private readonly storageService: StorageService,
        @InjectRepository(ProcessingJobs)
        private readonly processingJobsRepo: Repository<ProcessingJobs>,
    ) {
        super();
    }

    private async updateProgress(
        job: Job<ProcessPdfJob>,
        progress: ProcessingProgress,
    ): Promise<void> {
        await job.updateProgress(progress);
    }

    private persistStageTimings(
        jobId: string,
        status: JobStatus,
        stage: string,
        stageTimings: StageTimings,
        error?: string | null,
    ): void {
        this.processingJobsRepo
            .update(
                { jobId },
                {
                    status,
                    stage,
                    stageTimings,
                    ...(error != null && { error }),
                },
            )
            .catch((err) => {
                const msg = err instanceof Error ? err.message : String(err);
                this.logger.warn(`Failed to persist stage/timings for job ${jobId}: ${msg}`);
            });
    }

    async process(job: Job<ProcessPdfJob>) {
        const { fileId, tenantId, s3Key } = job.data;
        const jobId = job.id!;
        const stageTimings: StageTimings = {};

        this.logger.log(`Processing PDF job ${jobId} for file ${fileId}`);

        try {
            await this.processingJobsRepo.update(
                { jobId },
                { status: JobStatus.RUNNING, stage: ProcessingStage.PDF_SPLITTING },
            );
        } catch (updateError) {
            this.logger.warn(`Failed to update job status to RUNNING for job ${jobId}: ${updateError}`);
        }

        try {
            const t0 = Date.now();
            const pages = await this.pdfExtractor.extractFromS3(s3Key, fileId);
            stageTimings.pdfSplittingMs = Date.now() - t0;
            this.logger.log(`Extracted ${pages.length} pages from PDF ${fileId}`);

            await this.updateProgress(job, {
                processedPages: 0,
                totalPages: pages.length,
                percent: 0,
                stage: ProcessingStage.SAVING_PAGES,
                stageTimings: { ...stageTimings },
            });

            const t1 = Date.now();
            for (let i = 0; i < pages.length; i++) {
                const page = pages[i];
                await this.documentsService.savePages([page], fileId, tenantId);
                const percent = Math.floor(((i + 1) / pages.length) * 100);
                await this.updateProgress(job, {
                    processedPages: i + 1,
                    totalPages: pages.length,
                    percent,
                    stage: ProcessingStage.SAVING_PAGES,
                    stageTimings: { ...stageTimings, savingPagesMs: Date.now() - t1 },
                });
            }
            stageTimings.savingPagesMs = Date.now() - t1;
            this.logger.log(`Saved ${pages.length} pages to database for file ${fileId}`);

            await this.updateProgress(job, {
                processedPages: pages.length,
                totalPages: pages.length,
                percent: 100,
                stage: ProcessingStage.EMBEDDING_GENERATION,
                stageTimings: { ...stageTimings },
            });

            let embeddingMs = 0;
            let indexingMs = 0;
            try {
                const timings = await this.esIndexer.indexPages(tenantId, fileId, pages);
                embeddingMs = timings.embeddingMs;
                indexingMs = timings.indexingMs;
                stageTimings.embeddingMs = embeddingMs;
                stageTimings.indexingMs = indexingMs;
                this.logger.log(`Indexed ${pages.length} pages to Elasticsearch for file ${fileId}`);
            } catch (esError) {
                const esErrorMessage = esError instanceof Error ? esError.message : String(esError);
                this.logger.warn(
                    `Failed to index pages to Elasticsearch for file ${fileId}: ${esErrorMessage}. ` +
                    `Pages are saved to database and can be re-indexed later.`,
                );
            }

            await this.storageService.updateFileStatus(fileId, FileStatus.READY);

            this.persistStageTimings(
                jobId,
                JobStatus.COMPLETED,
                ProcessingStage.COMPLETED,
                stageTimings,
            );

            return { pages: pages.length, stageTimings };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Failed to process PDF job ${jobId} for file ${fileId}: ${errorMessage}`, errorStack);

            this.persistStageTimings(
                jobId,
                JobStatus.FAILED,
                ProcessingStage.FAILED,
                { ...stageTimings },
                errorMessage,
            );

            throw error;
        }
    }
}