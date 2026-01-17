import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ProcessingJobs, JobStatus } from "../entities/processing-job.entity";

@Injectable()
export class ProcessingJobsRepository {
    constructor(
        @InjectRepository(ProcessingJobs)
        private readonly processingJobsRepo: Repository<ProcessingJobs>,
    ) {}

    async create(job: Partial<ProcessingJobs>): Promise<ProcessingJobs> {
        const newJob = this.processingJobsRepo.create(job);
        return await this.processingJobsRepo.save(newJob);
    }

    async findByFileId(fileId: string): Promise<ProcessingJobs | null> {
        return await this.processingJobsRepo.findOne({
            where: { fileId },
            order: { createdAt: 'DESC' }
        });
    }

    async findByJobId(jobId: string): Promise<ProcessingJobs | null> {
        return await this.processingJobsRepo.findOne({
            where: { jobId }
        });
    }

    async updateStatus(
        id: string,
        status: JobStatus,
        error?: string | null
    ): Promise<void> {
        await this.processingJobsRepo.update(id, { status, error });
    }

    async updateByJobId(
        jobId: string,
        updates: Partial<ProcessingJobs>
    ): Promise<void> {
        await this.processingJobsRepo.update({ jobId }, updates);
    }
}