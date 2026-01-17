import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
    OnModuleInit,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, In, IsNull, LessThan, Not, Repository } from "typeorm";
import { randomUUID } from "crypto";
import { FolderRepository } from "../repositories/folder.repository";
import { FileRepository } from "../repositories/file.repository";
import { S3Service } from "./s3.service";
import { Folders } from "../entities/folder.entity";
import { Files, FileStatus } from "../entities/files.entity";
import { DocumentPages } from "src/modules/documents/entities/document-pages.entity";
import { ProcessingJobs, JobType, JobStatus } from "src/modules/processing/entities/processing-job.entity";
import { DocumentPagesRepository } from "src/modules/documents/repositories/document-pages.repository";
import { TenantRepository } from "src/modules/tenants/repositories/tenant.repository";
import { MembershipStatus } from "src/modules/tenants/constants/membership-status.enum";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";

@Injectable()
export class StorageService implements OnModuleInit {
    private readonly logger = new Logger(StorageService.name);
    private readonly purgeDays = 30;
    private readonly staleUploadHours = 2;
    private readonly cleanupIntervalMs = 15 * 60 * 1000;

    constructor(
        private readonly folderRepo: FolderRepository,
        private readonly fileRepo: FileRepository,
        private readonly s3Service: S3Service,
        private readonly tenantRepo: TenantRepository,
        private readonly dataSource: DataSource,
        private readonly documentPagesRepo: DocumentPagesRepository,
        @InjectRepository(Folders)
        private readonly foldersRepo: Repository<Folders>,
        @InjectRepository(Files)
        private readonly filesRepo: Repository<Files>,
        @InjectRepository(ProcessingJobs)
        private readonly processingJobsRepo: Repository<ProcessingJobs>,
        @InjectQueue('pdf-processing')
        private readonly pdfQueue: Queue,
    ) { }

    onModuleInit() {
        // Periodic cleanup for stale uploads
        setInterval(() => {
            this.cleanupStaleUploads().catch((error) => {
                this.logger.error(
                    `Failed to cleanup stale uploads: ${error.message || error}`,
                );
            });
        }, this.cleanupIntervalMs);
    }

    private resolveTenantId(inputTenantId: string | undefined, userTenantId?: string): string {
        const tenantId = userTenantId ?? inputTenantId;
        if (!tenantId) {
            throw new BadRequestException("Tenant context is required");
        }
        return tenantId;
    }

    private async ensureTenantAccess(userId: string, tenantId: string): Promise<void> {
        const status = await this.tenantRepo.findUserStatus(userId, tenantId);
        if (!status || status !== MembershipStatus.ACTIVE) {
            throw new ForbiddenException("Not a member of the tenant");
        }
    }

    private toLtreeId(id: string): string {
        return id.replace(/-/g, "");
    }

    private async buildFolderPathDisplay(folder: Folders): Promise<string> {
        const names: string[] = [folder.name];
        let currentParentId = folder.parentId;
        while (currentParentId) {
            const parent = await this.folderRepo.findById(folder.tenantId, currentParentId);
            if (!parent) {
                break;
            }
            names.push(parent.name);
            currentParentId = parent.parentId;
        }
        return `/${names.reverse().join("/")}`;
    }

    private async getPageCounts(tenantId: string, fileIds: string[]): Promise<Map<string, number>> {
        if (fileIds.length === 0) {
            return new Map();
        }
        return await this.documentPagesRepo.countByFileIds(tenantId, fileIds);
    }

    private async purgeExpiredDeleted(tenantId: string): Promise<void> {
        const threshold = new Date(Date.now() - this.purgeDays * 24 * 60 * 60 * 1000);
        const expiredFiles = await this.filesRepo.find({
            where: {
                tenantId,
                deletedAt: LessThan(threshold),
            },
            withDeleted: true,
        });
        for (const file of expiredFiles) {
            await this.deleteFilePermanently(tenantId, file);
        }

        const expiredFolders = await this.foldersRepo.find({
            where: {
                tenantId,
                deletedAt: LessThan(threshold),
            },
            withDeleted: true,
        });
        for (const folder of expiredFolders) {
            await this.deleteFolderPermanently(tenantId, folder);
        }
    }

    async createFolder(
        userId: string,
        tenantIdInput: string | undefined,
        name: string,
        parentId?: string | null,
    ) {
        const tenantId = this.resolveTenantId(tenantIdInput);
        await this.ensureTenantAccess(userId, tenantId);

        if (!parentId) {
            throw new BadRequestException("Root folder already exists");
        }

        const parent = parentId
            ? await this.folderRepo.findById(tenantId, parentId)
            : null;
        if (parentId && !parent) {
            throw new NotFoundException("Parent folder not found");
        }

        if (await this.folderRepo.existsActiveByName(tenantId, parentId ?? null, name)) {
            throw new BadRequestException("Folder already exists");
        }

        const id = randomUUID();
        const ltreeSegment = this.toLtreeId(id);
        const path = parent ? `${parent.path}.${ltreeSegment}` : ltreeSegment;

        const folder = await this.folderRepo.createFolder({
            id,
            tenantId,
            parentId: parentId ?? null,
            name,
            path,
            createdById: userId,
            updatedById: userId,
            deletedById: null,
        });

        const parentPath = parent ? await this.buildFolderPathDisplay(parent) : "";
        return {
            id: folder.id,
            path: parentPath ? `${parentPath}/${folder.name}` : `/${folder.name}`,
        };
    }

    async listFolders(
        userId: string,
        tenantIdInput: string | undefined,
        parentId?: string | null,
    ) {
        const tenantId = this.resolveTenantId(tenantIdInput);
        await this.ensureTenantAccess(userId, tenantId);
        const normalizedParentId = parentId ?? null;
        const folders = await this.folderRepo.listByParentId(tenantId, normalizedParentId);
        const childFolders = await this.folderRepo.listChildrenOfParents(
            tenantId,
            folders.map((f) => f.id),
        );

        const childMap = new Map<string, { id: string; name: string }[]>();
        for (const child of childFolders) {
            const list = childMap.get(child.parentId ?? "") ?? [];
            list.push({ id: child.id, name: child.name });
            childMap.set(child.parentId ?? "", list);
        }

        return folders.map((folder) => {
            const children = childMap.get(folder.id) ?? [];
            return {
                id: folder.id,
                name: folder.name,
                hasChildren: children.length > 0,
                children,
            };
        });
    }

    async getFolderDetails(userId: string, tenantIdInput: string | undefined, folderId: string) {
        const tenantId = this.resolveTenantId(tenantIdInput);
        await this.ensureTenantAccess(userId, tenantId);
        const folder = await this.folderRepo.findById(tenantId, folderId);
        if (!folder) {
            throw new NotFoundException("Folder not found");
        }

        const [folderCount, fileCount, pathDisplay] = await Promise.all([
            this.folderRepo.countChildren(tenantId, folder.id),
            this.filesRepo.count({
                where: {
                    tenantId,
                    folderId: folder.id,
                    deletedAt: IsNull(),
                },
            }),
            this.buildFolderPathDisplay(folder),
        ]);

        const depth = pathDisplay === "/" ? 0 : pathDisplay.split("/").filter(Boolean).length;

        return {
            id: folder.id,
            name: folder.name,
            parentId: folder.parentId,
            path: pathDisplay,
            depth,
            stats: {
                folderCount,
                fileCount,
            },
            createdAt: folder.createdAt,
            updatedAt: folder.updatedAt,
        };
    }

    async renameFolder(
        userId: string,
        tenantIdInput: string | undefined,
        folderId: string,
        name: string,
    ) {
        const tenantId = this.resolveTenantId(tenantIdInput);
        await this.ensureTenantAccess(userId, tenantId);
        const folder = await this.folderRepo.findById(tenantId, folderId);
        if (!folder) {
            throw new NotFoundException("Folder not found");
        }

        if (folder.name === name) {
            return {
                id: folder.id,
                name: folder.name,
                path: await this.buildFolderPathDisplay(folder),
                updatedAt: folder.updatedAt,
            };
        }

        if (await this.folderRepo.existsActiveByName(tenantId, folder.parentId, name)) {
            throw new BadRequestException("Folder name already exists");
        }

        const updated = await this.folderRepo.updateFolder(tenantId, folderId, {
            name,
            updatedById: userId,
        });

        return {
            id: updated?.id ?? folder.id,
            name: updated?.name ?? name,
            path: await this.buildFolderPathDisplay({
                ...folder,
                name,
            }),
            updatedAt: updated?.updatedAt ?? new Date(),
        };
    }

    async moveFolders(
        userId: string,
        tenantIdInput: string | undefined,
        folderIds: string[],
        targetParentId?: string | null,
    ) {
        const tenantId = this.resolveTenantId(tenantIdInput);
        await this.ensureTenantAccess(userId, tenantId);

        if (!targetParentId) {
            throw new BadRequestException("Target folder is required");
        }

        const results: Array<{
            folderId: string;
            state: "MOVED" | "FAILED";
            parentId?: string | null;
            depth?: number;
            error?: { code: string };
        }> = [];

        const targetParent = targetParentId
            ? await this.folderRepo.findById(tenantId, targetParentId)
            : null;
        if (targetParentId && !targetParent) {
            throw new NotFoundException("Target parent folder not found");
        }

        for (const folderId of folderIds) {
            const folder = await this.folderRepo.findById(tenantId, folderId);
            if (!folder) {
                results.push({
                    folderId,
                    state: "FAILED",
                    error: { code: "FOLDER_NOT_FOUND" },
                });
                continue;
            }

            if (targetParentId === folder.id) {
                results.push({
                    folderId,
                    state: "FAILED",
                    error: { code: "FOLDER_CYCLE_DETECTED" },
                });
                continue;
            }

            if (targetParentId === folder.parentId) {
                results.push({
                    folderId,
                    state: "MOVED",
                    parentId: targetParentId ?? null,
                    depth: folder.path.split(".").length,
                });
                continue;
            }

            if (targetParent && folder.path && targetParent.path) {
                const isCycle = await this.foldersRepo
                    .createQueryBuilder("folder")
                    .where("folder.id = :targetId", { targetId: targetParent.id })
                    .andWhere("folder.path <@ :path", { path: folder.path })
                    .getCount();
                if (isCycle > 0) {
                    results.push({
                        folderId,
                        state: "FAILED",
                        error: { code: "FOLDER_CYCLE_DETECTED" },
                    });
                    continue;
                }
            }

            if (
                await this.folderRepo.existsActiveByName(
                    tenantId,
                    targetParentId ?? null,
                    folder.name
                )
            ) {
                results.push({
                    folderId,
                    state: "FAILED",
                    error: { code: "FOLDER_NAME_CONFLICT" },
                });
                continue;
            }

            const oldPath = folder.path;
            const newPath = targetParent
                ? `${targetParent.path}.${this.toLtreeId(folder.id)}`
                : this.toLtreeId(folder.id);

            await this.dataSource.transaction(async (manager) => {
                await manager.getRepository(Folders).update(
                    { id: folder.id },
                    {
                        parentId: targetParentId ?? null,
                        updatedById: userId,
                    }
                );
                await this.folderRepo.updatePathForMove(
                    tenantId,
                    oldPath,
                    newPath,
                    userId,
                    manager
                );
            });

            const depth = newPath.split(".").length;
            results.push({
                folderId,
                state: "MOVED",
                parentId: targetParentId ?? null,
                depth,
            });
        }

        const moved = results.filter((r) => r.state === "MOVED").length;
        const failed = results.length - moved;

        return {
            requested: folderIds.length,
            moved,
            failed,
            results,
        };
    }

    async deleteFolders(
        userId: string,
        tenantIdInput: string | undefined,
        folderIds: string[],
    ) {
        const tenantId = this.resolveTenantId(tenantIdInput);
        await this.ensureTenantAccess(userId, tenantId);

        const results: Array<{
            id: string;
            state: "RECYCLED" | "FAILED";
            error?: { code: string };
        }> = [];

        for (const folderId of folderIds) {
            const folder = await this.folderRepo.findById(tenantId, folderId);
            if (!folder) {
                results.push({
                    id: folderId,
                    state: "FAILED",
                    error: { code: "FOLDER_NOT_FOUND" },
                });
                continue;
            }

            await this.dataSource.transaction(async (manager) => {
                const descendants = await this.folderRepo.listDescendantsByPath(
                    tenantId,
                    folder.path,
                    true
                );
                const descendantIds = descendants.map((d) => d.id);
                await this.folderRepo.markDeletedByPath(tenantId, folder.path, userId, manager);
                if (descendantIds.length > 0) {
                    const files = await manager.getRepository(Files).find({
                        where: {
                            tenantId,
                            folderId: In(descendantIds),
                            deletedAt: IsNull(),
                        },
                        select: ["id"],
                    });
                    if (files.length > 0) {
                        await this.fileRepo.markDeleted(
                            tenantId,
                            files.map((f) => f.id),
                            userId,
                            manager
                        );
                    }
                }
            });

            results.push({
                id: folderId,
                state: "RECYCLED",
            });
        }

        const succeeded = results.filter((r) => r.state === "RECYCLED").length;
        const failed = results.length - succeeded;
        return {
            requested: folderIds.length,
            succeeded,
            failed,
            results,
        };
    }

    async requestFileUpload(
        userId: string,
        tenantIdInput: string | undefined,
        dto: { fileName: string; mimeType: string; size: number; folderId: string },
    ) {
        const tenantId = this.resolveTenantId(tenantIdInput);
        await this.ensureTenantAccess(userId, tenantId);

        const folder = await this.folderRepo.findById(tenantId, dto.folderId);
        if (!folder) {
            throw new NotFoundException("Folder not found");
        }

        if (await this.fileRepo.existsActiveByName(tenantId, dto.folderId, dto.fileName)) {
            throw new BadRequestException("File already exists");
        }

        const id = randomUUID();
        const storageKey = `tenants/${tenantId}/files/${id}/${dto.fileName}`;
        console.log(storageKey);

        const file = await this.fileRepo.createFile({
            id,
            tenantId,
            folderId: dto.folderId,
            name: dto.fileName,
            originalName: dto.fileName,
            mimeType: dto.mimeType,
            sizeBytes: dto.size,
            storageKey,
            status: FileStatus.UPLOAD_PENDING,
            uploadedById: userId,
            deletedById: null,
        });

        try {
            // Use the storageKey we computed (file.storageKey might be undefined in raw query results)
            const uploadUrl = await this.s3Service.getPresignedUploadUrl(
                storageKey,
                dto.mimeType
            );
            return {
                fileId: file.id,
                uploadUrl,
                uploadHeaders: {
                    "Content-Type": dto.mimeType,
                },
            };
        } catch (error: any) {
            // If presigned URL generation fails, we should clean up the created file record
            await this.fileRepo.hardDeleteFiles(tenantId, [file.id]);
            throw new BadRequestException(
                `Failed to generate upload URL: ${error.message || 'Unknown error'}`
            );
        }
    }

    async confirmUpload(
        userId: string,
        tenantIdInput: string | undefined,
        fileId: string
    ) {
        const tenantId = this.resolveTenantId(tenantIdInput);
        await this.ensureTenantAccess(userId, tenantId);

        const file = await this.fileRepo.findById(tenantId, fileId);
        if (!file) {
            throw new NotFoundException("File not found");
        }

        const exists = await this.s3Service.objectExists(file.storageKey);
        if (!exists) {
            throw new BadRequestException("Upload not found in storage");
        }

        // Verify file has content (not 0 bytes)
        const fileSize = await this.s3Service.getObjectSize(file.storageKey);
        if (fileSize === null) {
            throw new BadRequestException("Unable to get file size from storage");
        }
        if (fileSize === 0) {
            throw new BadRequestException(
                "File is empty (0 bytes) in storage. Please ensure the file was uploaded correctly."
            );
        }

        if(file.status === FileStatus.UPLOADED) {
            throw new BadRequestException("File is already uploaded");
        } else if(file.status === FileStatus.PROCESSING) {
            throw new BadRequestException("File is already being processed");
        } else if(file.status === FileStatus.READY) {
            throw new BadRequestException("File is already processed");
        }

        await this.filesRepo.update(
            { id: file.id, tenantId },
            { status: FileStatus.UPLOADED }
        );

        const bullmqJob = await this.pdfQueue.add('process-pdf', {
            fileId: file.id,
            tenantId,
            s3Key: file.storageKey,
            mimeType: file.mimeType,
        }, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 1000,
            },
            removeOnComplete: true,
        });

        // Create ProcessingJobs record to track the job
        await this.processingJobsRepo.save({
            fileId: file.id,
            jobId: bullmqJob.id!,
            type: JobType.INDEX,
            status: JobStatus.PENDING
        });

        return {
            fileId: file.id,
            confirmed: true,
        };
    }

    async listFiles(
        userId: string,
        tenantIdInput: string | undefined,
        folderId: string,
    ) {
        const tenantId = this.resolveTenantId(tenantIdInput);
        await this.ensureTenantAccess(userId, tenantId);

        const folder = await this.folderRepo.findById(tenantId, folderId);
        if (!folder) {
            throw new NotFoundException("Folder not found");
        }

        const files = await this.fileRepo.listByFolderId(tenantId, folderId);
        const pageCounts = await this.getPageCounts(tenantId, files.map((f) => f.id));

        return files.map((file) => ({
            id: file.id,
            name: file.name,
            status: file.status,
            pages: pageCounts.get(file.id) ?? 0,
            createdAt: file.createdAt,
        }));
    }

    async getFileDownloadUrl(
        userId: string,
        tenantIdInput: string | undefined,
        fileId: string,
        expiresInSeconds = 3600
    ): Promise<{ url: string; expiresIn: number }> {
        const tenantId = this.resolveTenantId(tenantIdInput);
        await this.ensureTenantAccess(userId, tenantId);

        const file = await this.fileRepo.findById(tenantId, fileId);
        if (!file) {
            throw new NotFoundException("File not found");
        }

        const exists = await this.s3Service.objectExists(file.storageKey);
        if (!exists) {
            throw new NotFoundException("File not found in storage");
        }

        // Generate presigned URL for direct S3 access
        // This offloads bandwidth to S3 instead of streaming through the server
        const url = await this.s3Service.getPresignedDownloadUrl(file.storageKey, expiresInSeconds);

        return {
            url,
            expiresIn: expiresInSeconds,
        };
    }

    // Keep getFileStream for backward compatibility if needed, but prefer presigned URLs
    async getFileStream(
        userId: string,
        tenantIdInput: string | undefined,
        fileId: string
    ) {
        const tenantId = this.resolveTenantId(tenantIdInput);
        await this.ensureTenantAccess(userId, tenantId);

        const file = await this.fileRepo.findById(tenantId, fileId);
        if (!file) {
            throw new NotFoundException("File not found");
        }

        const exists = await this.s3Service.objectExists(file.storageKey);
        if (!exists) {
            throw new NotFoundException("File not found in storage");
        }

        const { stream, contentType, contentLength } = await this.s3Service.getFileStream(file.storageKey);

        return {
            stream,
            contentType: contentType || file.mimeType || 'application/pdf',
            contentLength,
            fileName: file.originalName || file.name,
        };
    }

    async getFileDetail(
        userId: string,
        tenantIdInput: string | undefined,
        fileId: string
    ) {
        const tenantId = this.resolveTenantId(tenantIdInput);
        await this.ensureTenantAccess(userId, tenantId);

        const file = await this.fileRepo.findById(tenantId, fileId);
        if (!file) {
            throw new NotFoundException("File not found");
        }

        const [pageCount, folder] = await Promise.all([
            this.documentPagesRepo.countByFileId(file.id),
            this.folderRepo.findById(tenantId, file.folderId),
        ]);

        if (!folder) {
            throw new NotFoundException("Parent folder not found");
        }

        const folderPath = await this.buildFolderPathDisplay(folder);

        return {
            id: file.id,
            name: file.name,
            type: "PDF",
            mimeType: file.mimeType,
            size: Number(file.sizeBytes),
            state: file.status,
            processing: {
                status: file.status,
                pages: pageCount,
                processedAt: file.status === FileStatus.READY ? file.updatedAt : null,
                failedReason: file.status === FileStatus.FAILED ? "Processing failed" : null,
            },
            folder: {
                id: folder.id,
                path: folderPath,
            },
            preview: {
                available: pageCount > 0,
                pageCount,
            },
            createdAt: file.createdAt,
            updatedAt: file.updatedAt,
        };
    }

    async moveFiles(
        userId: string,
        tenantIdInput: string | undefined,
        fileIds: string[],
        targetParentId?: string | null
    ) {
        const tenantId = this.resolveTenantId(tenantIdInput);
        await this.ensureTenantAccess(userId, tenantId);
        const targetFolderId = targetParentId ?? null;

        const targetFolder = targetFolderId
            ? await this.folderRepo.findById(tenantId, targetFolderId)
            : null;
        if (!targetFolderId) {
            throw new BadRequestException("Target folder is required");
        }
        if (!targetFolder) {
            throw new NotFoundException("Target folder not found");
        }

        const results: Array<{
            fileId: string;
            state: "MOVED" | "FAILED";
            parentId?: string | null;
            depth?: number;
            error?: { code: string };
        }> = [];

        for (const fileId of fileIds) {
            const file = await this.fileRepo.findById(tenantId, fileId);
            if (!file) {
                results.push({
                    fileId,
                    state: "FAILED",
                    error: { code: "FILE_NOT_FOUND" },
                });
                continue;
            }

            if (file.folderId === targetFolderId) {
                results.push({
                    fileId,
                    state: "MOVED",
                    parentId: targetFolderId,
                    depth: targetFolder.path.split(".").length,
                });
                continue;
            }

            if (await this.fileRepo.existsActiveByName(tenantId, targetFolderId, file.name)) {
                results.push({
                    fileId,
                    state: "FAILED",
                    error: { code: "FILE_NAME_CONFLICT" },
                });
                continue;
            }

            await this.filesRepo.update(
                { id: file.id },
                { folderId: targetFolderId }
            );
            results.push({
                fileId,
                state: "MOVED",
                parentId: targetFolderId,
                depth: targetFolder.path.split(".").length,
            });
        }

        const moved = results.filter((r) => r.state === "MOVED").length;
        const failed = results.length - moved;

        return {
            requested: fileIds.length,
            moved,
            failed,
            results,
        };
    }

    async deleteFiles(
        userId: string,
        tenantIdInput: string | undefined,
        fileIds: string[]
    ) {
        const tenantId = this.resolveTenantId(tenantIdInput);
        await this.ensureTenantAccess(userId, tenantId);

        const results: Array<{
            fileId: string;
            status: "RECYCLED" | "FAILED";
            error?: { code: string };
        }> = [];

        for (const fileId of fileIds) {
            const file = await this.fileRepo.findById(tenantId, fileId);
            if (!file) {
                results.push({
                    fileId,
                    status: "FAILED",
                    error: { code: "FILE_NOT_FOUND" },
                });
                continue;
            }
            await this.fileRepo.markDeleted(tenantId, [fileId], userId);
            await this.documentPagesRepo.softDeletePages(tenantId, [fileId]);
            results.push({
                fileId,
                status: "RECYCLED",
            });
        }

        const deleted = results.filter((r) => r.status === "RECYCLED").length;
        const failed = results.length - deleted;

        return {
            requested: fileIds.length,
            deleted,
            failed,
            results,
        };
    }

    async listRecycleBin(
        userId: string,
        tenantIdInput: string | undefined,
        page: number,
        limit: number,
        offset: number
    ) {
        const tenantId = this.resolveTenantId(tenantIdInput);
        await this.ensureTenantAccess(userId, tenantId);
        await this.purgeExpiredDeleted(tenantId);

        const deletedFolders = await this.foldersRepo.find({
            where: { tenantId, deletedAt: Not(IsNull()) },
            withDeleted: true,
        });
        const deletedFiles = await this.filesRepo.find({
            where: { tenantId, deletedAt: Not(IsNull()) },
            withDeleted: true,
        });

        const items = [
            ...deletedFolders.map((folder) => ({
                id: folder.id,
                type: "FOLDER" as const,
                name: folder.name,
                originalParentId: folder.parentId ?? null,
                recycledAt: folder.deletedAt ?? folder.updatedAt ?? folder.createdAt,
            })),
            ...deletedFiles.map((file) => ({
                id: file.id,
                type: "FILE" as const,
                name: file.name,
                originalFolderId: file.folderId,
                recycledAt: file.deletedAt ?? file.updatedAt ?? file.createdAt,
            })),
        ].sort((a, b) => b.recycledAt.getTime() - a.recycledAt.getTime());

        const paginated = items.slice(offset, offset + limit);
        return {
            data: paginated,
            pagination: {
                page,
                limit,
                total: items.length,
            },
        };
    }

    private async cleanupStaleUploads(): Promise<void> {
        const threshold = new Date(Date.now() - this.staleUploadHours * 60 * 60 * 1000);
        const tenantRows = await this.filesRepo
            .createQueryBuilder("file")
            .select("DISTINCT file.tenant_id", "tenantId")
            .where("file.status = :status", { status: FileStatus.UPLOADED })
            .andWhere("file.deletedAt IS NULL")
            .getRawMany<{ tenantId: string }>();

        for (const row of tenantRows) {
            const files = await this.fileRepo.listStaleUploads(row.tenantId, threshold, 100);
            for (const file of files) {
                const exists = await this.s3Service.objectExists(file.storageKey);
                if (!exists) {
                    await this.fileRepo.hardDeleteFiles(file.tenantId, [file.id]);
                    this.logger.warn(`Deleted stale upload ${file.id} for tenant ${file.tenantId}`);
                }
            }
        }
    }

    async restoreRecycleBin(
        userId: string,
        tenantIdInput: string | undefined,
        ids: string[]
    ) {
        const tenantId = this.resolveTenantId(tenantIdInput);
        await this.ensureTenantAccess(userId, tenantId);

        const [folders, files] = await Promise.all([
            this.folderRepo.listByIds(tenantId, ids, true),
            this.fileRepo.listByIds(tenantId, ids, true),
        ]);

        const folderMap = new Map(folders.map((f) => [f.id, f]));
        const fileMap = new Map(files.map((f) => [f.id, f]));

        const results: Array<{
            id: string;
            type: "FILE" | "FOLDER";
            state: "ACTIVE" | "FAILED";
            parentId?: string | null;
            error?: { code: string };
        }> = [];

        for (const id of ids) {
            const folder = folderMap.get(id);
            if (folder && folder.deletedAt) {
                const parentInBatch = folder.parentId ? folderMap.has(folder.parentId) : false;
                const parentOk = folder.parentId
                    ? await this.folderRepo.findById(tenantId, folder.parentId, true)
                    : null;
                if (folder.parentId && !parentInBatch && (!parentOk || parentOk.deletedAt)) {
                    results.push({
                        id,
                        type: "FOLDER",
                        state: "FAILED",
                        error: { code: "RESTORE_CONFLICT" },
                    });
                    continue;
                }

                if (await this.folderRepo.existsActiveByName(tenantId, folder.parentId, folder.name)) {
                    results.push({
                        id,
                        type: "FOLDER",
                        state: "FAILED",
                        error: { code: "NAME_CONFLICT" },
                    });
                    continue;
                }

                await this.dataSource.transaction(async (manager) => {
                    await this.folderRepo.restoreByPath(tenantId, folder.path, userId, manager);
                    const descendants = await this.folderRepo.listDescendantsByPath(
                        tenantId,
                        folder.path,
                        true
                    );
                    const descendantIds = descendants.map((d) => d.id);
                    if (descendantIds.length > 0) {
                        const files = await manager.getRepository(Files).find({
                            where: {
                                tenantId,
                                folderId: In(descendantIds),
                            },
                            select: ["id"],
                            withDeleted: true,
                        });
                        if (files.length > 0) {
                            await this.fileRepo.restoreFiles(
                                tenantId,
                                files.map((f) => f.id),
                                manager
                            );
                            await this.documentPagesRepo.restorePages(
                                tenantId,
                                files.map((f) => f.id),
                                manager
                            );
                        }
                    }
                });

                results.push({
                    id,
                    type: "FOLDER",
                    state: "ACTIVE",
                    parentId: folder.parentId ?? null,
                });
                continue;
            }

            const file = fileMap.get(id);
            if (file && file.deletedAt) {
                const parentInBatch = folderMap.has(file.folderId);
                const parent = await this.folderRepo.findById(tenantId, file.folderId, true);
                if (!parentInBatch && (!parent || parent.deletedAt)) {
                    results.push({
                        id,
                        type: "FILE",
                        state: "FAILED",
                        error: { code: "RESTORE_CONFLICT" },
                    });
                    continue;
                }

                if (await this.fileRepo.existsActiveByName(tenantId, file.folderId, file.name)) {
                    results.push({
                        id,
                        type: "FILE",
                        state: "FAILED",
                        error: { code: "NAME_CONFLICT" },
                    });
                    continue;
                }

                await this.fileRepo.restoreFiles(tenantId, [file.id]);
                await this.documentPagesRepo.restorePages(tenantId, [file.id]);
                results.push({
                    id,
                    type: "FILE",
                    state: "ACTIVE",
                    parentId: file.folderId,
                });
                continue;
            }

            results.push({
                id,
                type: "FILE",
                state: "FAILED",
                error: { code: "ITEM_NOT_FOUND" },
            });
        }

        const restored = results.filter((r) => r.state === "ACTIVE").length;
        const failed = results.length - restored;
        return {
            requested: ids.length,
            restored,
            failed,
            results,
        };
    }

    async permanentDeleteRecycleBin(
        userId: string,
        tenantIdInput: string | undefined,
        ids: string[]
    ) {
        const tenantId = this.resolveTenantId(tenantIdInput);
        await this.ensureTenantAccess(userId, tenantId);
        await this.purgeExpiredDeleted(tenantId);

        const [folders, files] = await Promise.all([
            this.folderRepo.listByIds(tenantId, ids, true),
            this.fileRepo.listByIds(tenantId, ids, true),
        ]);

        const folderMap = new Map(folders.map((f) => [f.id, f]));
        const fileMap = new Map(files.map((f) => [f.id, f]));

        const results: Array<{
            id: string;
            state: "PURGED" | "FAILED";
            purgedAt?: Date;
            error?: { code: string };
        }> = [];

        for (const id of ids) {
            const folder = folderMap.get(id);
            if (folder && folder.deletedAt) {
                await this.deleteFolderPermanently(tenantId, folder);
                results.push({
                    id,
                    state: "PURGED",
                    purgedAt: new Date(),
                });
                continue;
            }

            const file = fileMap.get(id);
            if (file && file.deletedAt) {
                await this.deleteFilePermanently(tenantId, file);
                results.push({
                    id,
                    state: "PURGED",
                    purgedAt: new Date(),
                });
                continue;
            }

            results.push({
                id,
                state: "FAILED",
                error: { code: "ITEM_NOT_FOUND" },
            });
        }

        return {
            data: {
                id: ids.length === 1 ? ids[0] : undefined,
                state: "PURGED",
                purgedAt: new Date().toISOString(),
            },
            results,
        };
    }

    private async deleteFilePermanently(tenantId: string, file: Files): Promise<void> {
        await this.dataSource.transaction(async (manager) => {
            await manager.getRepository(DocumentPages).delete({ fileId: file.id });
            await manager.getRepository(ProcessingJobs).delete({ fileId: file.id });
            await manager.getRepository(Files).delete({ id: file.id, tenantId });
        });
        await this.s3Service.deleteObject(file.storageKey);
    }

    private async deleteFolderPermanently(tenantId: string, folder: Folders): Promise<void> {
        const descendants = await this.folderRepo.listDescendantsByPath(
            tenantId,
            folder.path,
            true
        );
        const descendantIds = descendants.map((d) => d.id);
        const files = await this.filesRepo.find({
            where: {
                tenantId,
                folderId: In(descendantIds),
            },
        });

        await this.dataSource.transaction(async (manager) => {
            if (files.length > 0) {
                const fileIds = files.map((f) => f.id);
                await manager.getRepository(DocumentPages).delete({ fileId: In(fileIds) });
                await manager.getRepository(ProcessingJobs).delete({ fileId: In(fileIds) });
                await manager.getRepository(Files).delete({ id: In(fileIds), tenantId });
            }
            await this.folderRepo.hardDeleteByPath(tenantId, folder.path, manager);
        });

        for (const file of files) {
            await this.s3Service.deleteObject(file.storageKey);
        }
    }

    async updateFileStatus(fileId: string, status: FileStatus): Promise<void> {
        await this.filesRepo.update(fileId, { status });
    }

    async checkFileStatus(fileId: string): Promise<FileStatus> {
        const file = await this.filesRepo.findOne({ where: { id: fileId } });
        if (!file) {
            throw new NotFoundException("File not found");
        }
        return file.status;
    }

}