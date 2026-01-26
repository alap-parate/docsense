import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, In, IsNull, LessThan, Repository } from "typeorm";
import { Files } from "../entities/files.entity";
import { FileStatus } from "../entities/files.entity";

@Injectable()
export class FileRepository {
    constructor(
        @InjectRepository(Files)
        private readonly fileRepo: Repository<Files>,
    ) {}

    async createFile(
        input: Partial<Files>,
        manager?: EntityManager
    ): Promise<Files> {
        const repo = manager ? manager.getRepository(Files) : this.fileRepo;
        const result = await repo
            .createQueryBuilder()
            .insert()
            .into(Files)
            .values(input)
            .returning("*")
            .execute();
        return result.raw[0];
    }

    async findById(
        tenantId: string,
        fileId: string,
        withDeleted = false
    ): Promise<Files | null> {
        return this.fileRepo.findOne({
            where: { id: fileId, tenantId },
            withDeleted,
        });
    }

    async listByFolderId(
        tenantId: string,
        folderId: string,
        withDeleted = false
    ): Promise<Files[]> {
        if (withDeleted) {
            return this.fileRepo.find({
                where: {
                    tenantId,
                    folderId,
                },
                withDeleted: true,
                order: {
                    createdAt: "DESC",
                },
            });
        }
        return this.fileRepo.find({
            where: {
                tenantId,
                folderId,
                deletedAt: IsNull(),
            },
            order: {
                createdAt: "DESC",
            },
        });
    }

    async listByIds(
        tenantId: string,
        fileIds: string[],
        withDeleted = false
    ): Promise<Files[]> {
        if (fileIds.length === 0) {
            return [];
        }
        return this.fileRepo.find({
            where: {
                id: In(fileIds),
                tenantId,
            },
            withDeleted,
        });
    }

    async existsActiveByName(
        tenantId: string,
        folderId: string,
        name: string
    ): Promise<boolean> {
        const result = await this.fileRepo.findOne({
            where: {
                tenantId,
                folderId,
                name,
                deletedAt: IsNull(),
            },
            select: { id: true },
        });
        return Boolean(result);
    }

    async markDeleted(
        tenantId: string,
        fileIds: string[],
        deletedById: string,
        manager?: EntityManager
    ): Promise<number> {
        if (fileIds.length === 0) {
            return 0;
        }
        const repo = manager ? manager.getRepository(Files) : this.fileRepo;
        const result = await repo
            .createQueryBuilder()
            .update(Files)
            .set({
                deletedAt: () => "CURRENT_TIMESTAMP",
                deletedById,
            })
            .where("tenant_id = :tenantId", { tenantId })
            .andWhere("id IN (:...fileIds)", { fileIds })
            .andWhere("deletedAt IS NULL")
            .execute();
        return result.affected ?? 0;
    }

    async restoreFiles(
        tenantId: string,
        fileIds: string[],
        manager?: EntityManager
    ): Promise<number> {
        if (fileIds.length === 0) {
            return 0;
        }
        const repo = manager ? manager.getRepository(Files) : this.fileRepo;
        const result = await repo
            .createQueryBuilder()
            .update(Files)
            .set({
                deletedAt: null,
                deletedById: null,
            })
            .where("tenant_id = :tenantId", { tenantId })
            .andWhere("id IN (:...fileIds)", { fileIds })
            .execute();
        return result.affected ?? 0;
    }

    async hardDeleteFiles(
        tenantId: string,
        fileIds: string[],
        manager?: EntityManager
    ): Promise<number> {
        if (fileIds.length === 0) {
            return 0;
        }
        const repo = manager ? manager.getRepository(Files) : this.fileRepo;
        const result = await repo
            .createQueryBuilder()
            .delete()
            .from(Files)
            .where("tenant_id = :tenantId", { tenantId })
            .andWhere("id IN (:...fileIds)", { fileIds })
            .execute();
        return result.affected ?? 0;
    }

    async listStaleUploads(
        tenantId: string,
        olderThan: Date,
        limit = 100
    ): Promise<Files[]> {
        return this.fileRepo.find({
            where: {
                tenantId,
                status: FileStatus.UPLOADED,
                deletedAt: IsNull(),
                createdAt: LessThan(olderThan),
            },
            order: {
                createdAt: "ASC",
            },
            take: limit,
        });
    }
}
