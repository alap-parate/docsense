import { BaseEntity } from "src/core/database/entities/base.entity";
import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { Users } from "src/modules/users/entities/users.entity";
import { Tenants } from "src/modules/tenants/entities/tenants.entity";
import { Folders } from "./folder.entity";

export enum FileStatus {
    UPLOAD_PENDING = 'UPLOAD_PENDING',
    UPLOADED = 'UPLOADED',
    PROCESSING = 'PROCESSING',
    READY = 'READY',
    FAILED = 'FAILED'
}

@Entity({
    name: 'files'
})
@Index(['tenantId', 'folderId'])
@Index(['tenantId', 'folderId', 'name'], { unique: true })
export class Files extends BaseEntity {
    
    @Column({
        name: 'tenant_id',
        type: 'uuid'
    })
    tenantId!: string;

    @Column({
        name: 'folder_id',
        type: 'uuid'
    })
    folderId!: string;

    @Column({
        name: 'name',
        type: 'varchar'
    })
    name!: string;
    
    @Column({
        name: 'original_name',
        type: 'varchar'
    })
    originalName!: string;

    @Column({
        name: 'mime_type',
        type: 'varchar'
    })
    mimeType!: string;
    
    @Column({
        name: 'size_bytes',
        type: 'bigint'
    })
    sizeBytes!: number;

    @Column({
        name: 'storage_key',
        type: 'varchar'
    })
    storageKey!: string;

    @Column({
        name: 'status',
        type: 'enum',
        enum: FileStatus,
        default: FileStatus.UPLOAD_PENDING
    })
    status!: FileStatus;

    @Column({
        name: 'uploaded_by',
        type: 'uuid'
    })
    uploadedById!: string;

    @Column({
        name: 'deleted_by',
        type: 'uuid',
        nullable: true
    })
    deletedById!: string | null;
    
    @ManyToOne(() => Users, user => user.id, { nullable: false })
    @JoinColumn({ name: 'uploaded_by' })
    uploadedBy!: Users

    @ManyToOne(() => Users, user => user.id, { nullable: true })
    @JoinColumn({ name: 'deleted_by' })
    deletedBy!: Users | null

    @ManyToOne(() => Tenants, tenant => tenant.id, { nullable: false })
    @JoinColumn({ name: 'tenant_id' })
    tenant!: Tenants;

    @ManyToOne(() => Folders, folder => folder.id, { nullable: false })
    @JoinColumn({ name: 'folder_id' })
    folder!: Folders;
    
}