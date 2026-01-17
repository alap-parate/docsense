import { Controller, Get, Param, NotFoundException, UseGuards } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { AuthGuard } from "src/core/auth/guards/auth-guard";
import { CurrentUser } from "src/shared/decorators/current-user.decorator";
import type { AuthUser } from "src/shared/types/auth-user.type";
import { ProcessingJobsService } from "./services/processing-jobs.service";

interface ProgressResponse {
    processedPages: number;
    totalPages: number;
    percent: number;
    status: string;
}

@Controller({
    version: "1",
    path: "processing",
})
@UseGuards(AuthGuard)
export class ProcessingController {
    constructor(
        private readonly processingJobsService: ProcessingJobsService,
        @InjectQueue('pdf-processing')
        private readonly pdfQueue: Queue
    ) {}

    @Get("progress/:fileId")
    async getProgress(
        @Param("fileId") fileId: string,
        @CurrentUser() user: AuthUser
    ): Promise<ProgressResponse> {
        // Get the ProcessingJobs record by fileId to find the BullMQ jobId
        const processingJob = await this.processingJobsService.findByFileId(fileId);
        
        if (!processingJob || !processingJob.jobId) {
            throw new NotFoundException(`No processing job found for file ${fileId}`);
        }

        // Get the BullMQ job using the jobId
        const bullmqJob = await this.pdfQueue.getJob(processingJob.jobId);
        
        if (!bullmqJob) {
            // Job might have been removed if removeOnComplete: true
            // Return the status from the database instead
            return {
                processedPages: 0,
                totalPages: 0,
                percent: processingJob.status === 'COMPLETED' ? 100 : 0,
                status: processingJob.status
            };
        }

        // Get job state from BullMQ
        const state = await bullmqJob.getState();
        
        // Get progress from BullMQ (this is the progress object we set in the processor)
        const progress = bullmqJob.progress as ProgressResponse | number | undefined;
        
        // If progress is an object with processedPages/totalPages/percent, use it
        // Otherwise, construct from the job state
        if (progress && typeof progress === 'object' && 'processedPages' in progress) {
            return {
                ...progress,
                status: state
            };
        }

        // Fallback: return basic progress based on state
        return {
            processedPages: typeof progress === 'number' ? progress : 0,
            totalPages: 0,
            percent: state === 'completed' ? 100 : (state === 'active' ? 50 : 0),
            status: state
        };
    }
}