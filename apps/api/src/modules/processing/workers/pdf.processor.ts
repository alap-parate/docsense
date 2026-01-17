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

export interface ProcessPdfJob {
    fileId: string;
    tenantId: string;
    s3Key: string;
    mimeType: 'application/pdf';
}

// Get concurrency from environment variable, default to 3
const PDF_PROCESSING_CONCURRENCY = parseInt(process.env.PDF_PROCESSING_CONCURRENCY || '3', 10);

@Processor('pdf-processing', {
    concurrency: PDF_PROCESSING_CONCURRENCY, // Process multiple PDFs concurrently
})
export class pdfProcessor extends WorkerHost {
    private readonly logger = new Logger(pdfProcessor.name);

    constructor(
        private readonly pdfExtractor: PdfExtractorService,
        private readonly esIndexer: EsIndexerService,
        private readonly documentsService: DocumentsService,
        private readonly storageService: StorageService,
        @InjectRepository(ProcessingJobs)
        private readonly processingJobsRepo: Repository<ProcessingJobs>
    ) {
        super();
    }

    async process(job: Job<ProcessPdfJob>) {
        const { fileId, tenantId, s3Key } = job.data;
        const jobId = job.id!;
        
        this.logger.log(`Processing PDF job ${jobId} for file ${fileId}`);

        // Update job status to RUNNING
        try {
            await this.processingJobsRepo.update(
                { jobId },
                { status: JobStatus.RUNNING }
            );
        } catch (updateError) {
            this.logger.warn(`Failed to update job status to RUNNING for job ${jobId}: ${updateError}`);
        }

        try {
            // Extract pages with progress tracking
            const pages = await this.pdfExtractor.extractFromS3(s3Key, fileId);
            this.logger.log(`Extracted ${pages.length} pages from PDF ${fileId}`);

            // Report initial progress
            await job.updateProgress({
                processedPages: 0,
                totalPages: pages.length,
                percent: 0
            });

            // Save pages to database with progress tracking
            for (let i = 0; i < pages.length; i++) {
                const page = pages[i];
                await this.documentsService.savePages([page], fileId, tenantId);
                
                // Update progress after each page
                const progress = {
                    processedPages: i + 1,
                    totalPages: pages.length,
                    percent: Math.floor(((i + 1) / pages.length) * 100)
                };
                await job.updateProgress(progress);
            }
            
            this.logger.log(`Saved ${pages.length} pages to database for file ${fileId}`);
            
            // Try to index to Elasticsearch, but don't fail the job if it fails
            // Pages are already saved to the database, which is the source of truth
            try {
                await this.esIndexer.indexPages(tenantId, fileId, pages);
                this.logger.log(`Indexed ${pages.length} pages to Elasticsearch for file ${fileId}`);
            } catch (esError) {
                const esErrorMessage = esError instanceof Error ? esError.message : String(esError);
                this.logger.warn(
                    `Failed to index pages to Elasticsearch for file ${fileId}: ${esErrorMessage}. ` +
                    `Pages are saved to database and can be re-indexed later.`
                );
            }

            await this.storageService.updateFileStatus(fileId, FileStatus.READY);

            // Update job status to COMPLETED
            await this.processingJobsRepo.update(
                { jobId },
                { status: JobStatus.COMPLETED }
            );

            return { pages: pages.length };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Failed to process PDF job ${jobId} for file ${fileId}: ${errorMessage}`, errorStack);
            
            // Update job status to FAILED
            try {
                await this.processingJobsRepo.update(
                    { jobId },
                    { status: JobStatus.FAILED, error: errorMessage }
                );
            } catch (updateError) {
                this.logger.warn(`Failed to update job status to FAILED for job ${jobId}: ${updateError}`);
            }
            
            throw error; // Re-throw to mark job as failed
        }
    }
}