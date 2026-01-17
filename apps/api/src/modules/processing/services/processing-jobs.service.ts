import { Injectable } from "@nestjs/common";
import { ProcessingJobsRepository } from "../repositories/processing-jobs.repository";
import { ProcessingJobs, JobType, JobStatus } from "../entities/processing-job.entity";

@Injectable()
export class ProcessingJobsService {
    constructor(
        private readonly processingJobsRepo: ProcessingJobsRepository
    ) {}

    async createJob(
        fileId: string,
        jobId: string,
        type: JobType = JobType.INDEX
    ): Promise<ProcessingJobs> {
        return await this.processingJobsRepo.create({
            fileId,
            jobId,
            type,
            status: JobStatus.PENDING
        });
    }

    async updateJobStatus(
        jobId: string,
        status: JobStatus,
        error?: string | null
    ): Promise<void> {
        await this.processingJobsRepo.updateByJobId(jobId, { status, error });
    }

    async findByFileId(fileId: string): Promise<ProcessingJobs | null> {
        return await this.processingJobsRepo.findByFileId(fileId);
    }

    async findByJobId(jobId: string): Promise<ProcessingJobs | null> {
        return await this.processingJobsRepo.findByJobId(jobId);
    }
}