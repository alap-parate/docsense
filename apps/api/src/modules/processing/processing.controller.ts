import { Controller, Get, Param, NotFoundException, UseGuards } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { AuthGuard } from "src/core/auth/guards/auth-guard";
import { CurrentUser } from "src/shared/decorators/current-user.decorator";
import type { AuthUser } from "src/shared/types/auth-user.type";
import { ProcessingJobsService } from "./services/processing-jobs.service";
import type { StageHistoryEntry, StageTimings } from "./constants/processing-stage.enum";
import type { JobStatus, JobType } from "./entities/processing-job.entity";

export interface ProgressResponse {
    processedPages: number;
    totalPages: number;
    percent: number;
    status: string;
    stage?: string | null;
    stageTimings?: StageTimings | null;
}

export interface ProcessingHistoryResponse {
    id: string;
    fileId: string;
    type: JobType;
    status: JobStatus;
    jobId?: string | null;
    error?: string | null;
    stage?: string | null;
    stageTimings?: StageTimings | null;
    stageHistory?: StageHistoryEntry[] | null;
    createdAt: string;
    updatedAt: string;
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
        private readonly pdfQueue: Queue,
    ) {}

    @Get("progress/:fileId")
    async getProgress(
        @Param("fileId") fileId: string,
        @CurrentUser() _user: AuthUser,
    ): Promise<ProgressResponse> {
        const processingJob = await this.processingJobsService.findByFileId(fileId);

        if (!processingJob || !processingJob.jobId) {
            throw new NotFoundException(`No processing job found for file ${fileId}`);
        }

        const bullmqJob = await this.pdfQueue.getJob(processingJob.jobId);

        if (!bullmqJob) {
            return {
                processedPages: 0,
                totalPages: 0,
                percent: processingJob.status === "COMPLETED" ? 100 : 0,
                status: processingJob.status,
                stage: processingJob.stage ?? null,
                stageTimings: processingJob.stageTimings ?? null,
            };
        }

        const state = await bullmqJob.getState();
        const progress = bullmqJob.progress as ProgressResponse | number | undefined;

        if (progress && typeof progress === "object" && "processedPages" in progress) {
            return {
                processedPages: progress.processedPages,
                totalPages: progress.totalPages,
                percent: progress.percent,
                status: state,
                stage: progress.stage ?? null,
                stageTimings: progress.stageTimings ?? null,
            };
        }

        return {
            processedPages: typeof progress === "number" ? progress : 0,
            totalPages: 0,
            percent: state === "completed" ? 100 : state === "active" ? 50 : 0,
            status: state,
            stage: processingJob.stage ?? null,
            stageTimings: processingJob.stageTimings ?? null,
        };
    }

    @Get("history/:fileId")
    async getProcessingHistory(
        @Param("fileId") fileId: string,
        @CurrentUser() _user: AuthUser,
    ): Promise<ProcessingHistoryResponse[]> {
        const jobs = await this.processingJobsService.findAllByFileId(fileId);
        return jobs.map((job) => ({
            id: job.id,
            fileId: job.fileId,
            type: job.type,
            status: job.status,
            jobId: job.jobId ?? null,
            error: job.error ?? null,
            stage: job.stage ?? null,
            stageTimings: job.stageTimings ?? null,
            stageHistory: job.stageHistory ?? null,
            createdAt: job.createdAt.toISOString(),
            updatedAt: (job.updatedAt ?? job.createdAt).toISOString(),
        }));
    }
}