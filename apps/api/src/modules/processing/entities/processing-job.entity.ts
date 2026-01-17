import { BaseEntity } from "src/core/database/entities/base.entity";
import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { Files } from "src/modules/storage/entities/files.entity";

export enum JobType {
    OCR = 'OCR',
    INDEX = 'INDEX',
}

export enum JobStatus {
    PENDING = 'PENDING',
    RUNNING = 'RUNNING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
}

@Entity({
    name: 'processing_jobs'
})
export class ProcessingJobs extends BaseEntity {
    
    @Column({
        name: 'file_id',
        type: 'uuid'
    })
    fileId!: string;

    @Column({
        name: 'type',
        type: 'enum',
        enum: JobType,
        default: JobType.INDEX
    })
    type!: JobType;

    @Column({
        name: 'status',
        type: 'enum',
        enum: JobStatus,
        default: JobStatus.PENDING
    })
    status!: JobStatus;

    @Column({
        name: 'job_id',
        type: 'varchar',
        nullable: true
    })
    jobId?: string | null;

    @Column({
        name: 'error',
        type: 'text',
        nullable: true
    })
    error?: string | null;

    @ManyToOne(() => Files, file => file.id, { nullable: false })
    @JoinColumn({ name: 'file_id' })
    file!: Files;
    
}