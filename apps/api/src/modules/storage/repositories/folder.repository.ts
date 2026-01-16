import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, In, IsNull, Repository } from "typeorm";
import { Folders } from "../entities/folder.entity";

@Injectable()
export class FolderRepository {
    constructor(
        @InjectRepository(Folders)
        private readonly folderRepo: Repository<Folders>,
    ) {}

    async findById(
        tenantId: string,
        folderId: string,
        withDeleted = false
    ): Promise<Folders | null> {
        return this.folderRepo.findOne({
            where: { id: folderId, tenantId },
            withDeleted,
        });
    }

    async listByParentId(
        tenantId: string,
        parentId: string | null
    ): Promise<Folders[]> {
        return this.folderRepo.find({
            where: {
                tenantId,
                parentId: parentId ?? IsNull(),
                deletedAt: IsNull(),
            },
            order: {
                createdAt: "ASC",
            },
        });
    }

    async listChildrenOfParents(
        tenantId: string,
        parentIds: string[]
    ): Promise<Folders[]> {
        if (parentIds.length === 0) {
            return [];
        }
        return this.folderRepo.find({
            where: {
                tenantId,
                parentId: In(parentIds),
                deletedAt: IsNull(),
            },
            order: {
                createdAt: "ASC",
            },
        });
    }

    async createFolder(
        input: Partial<Folders>,
        manager?: EntityManager
    ): Promise<Folders> {
        const repo = manager ? manager.getRepository(Folders) : this.folderRepo;
        const result = await repo
            .createQueryBuilder()
            .insert()
            .into(Folders)
            .values(input)
            .returning("*")
            .execute();
        return result.raw[0];
    }

    async updateFolder(
        tenantId: string,
        folderId: string,
        update: Partial<Folders>
    ): Promise<Folders | null> {
        const result = await this.folderRepo
            .createQueryBuilder()
            .update(Folders)
            .set(update)
            .where("id = :folderId", { folderId })
            .andWhere("tenant_id = :tenantId", { tenantId })
            .returning("*")
            .execute();
        return result.raw[0] ?? null;
    }

    async listByIds(
        tenantId: string,
        folderIds: string[],
        withDeleted = false
    ): Promise<Folders[]> {
        if (folderIds.length === 0) {
            return [];
        }
        return this.folderRepo.find({
            where: {
                id: In(folderIds),
                tenantId,
            },
            withDeleted,
        });
    }

    async countChildren(
        tenantId: string,
        parentId: string
    ): Promise<number> {
        return this.folderRepo.count({
            where: {
                tenantId,
                parentId,
                deletedAt: IsNull(),
            },
        });
    }

    async existsActiveByName(
        tenantId: string,
        parentId: string | null,
        name: string
    ): Promise<boolean> {
        const result = await this.folderRepo.findOne({
            where: {
                tenantId,
                parentId: parentId ?? IsNull(),
                name,
                deletedAt: IsNull(),
            },
            select: { id: true },
        });
        return Boolean(result);
    }

    async listDescendantsByPath(
        tenantId: string,
        path: string,
        withDeleted = false
    ): Promise<Folders[]> {
        const qb = this.folderRepo
            .createQueryBuilder("folder")
            .where("folder.tenant_id = :tenantId", { tenantId })
            .andWhere("folder.path <@ :path", { path });
        if (withDeleted) {
            qb.withDeleted();
        }
        return qb.getMany();
    }

    async markDeletedByPath(
        tenantId: string,
        path: string,
        deletedById: string,
        manager?: EntityManager
    ): Promise<number> {
        const repo = manager ? manager.getRepository(Folders) : this.folderRepo;
        const result = await repo
            .createQueryBuilder()
            .update(Folders)
            .set({
                deletedAt: () => "CURRENT_TIMESTAMP",
                deletedById,
                updatedById: deletedById,
            })
            .where("tenant_id = :tenantId", { tenantId })
            .andWhere("path <@ :path", { path })
            .andWhere("deletedAt IS NULL")
            .execute();
        return result.affected ?? 0;
    }

    async restoreByPath(
        tenantId: string,
        path: string,
        restoredById: string,
        manager?: EntityManager
    ): Promise<number> {
        const repo = manager ? manager.getRepository(Folders) : this.folderRepo;
        const result = await repo
            .createQueryBuilder()
            .update(Folders)
            .set({
                deletedAt: null,
                deletedById: null,
                updatedById: restoredById,
            })
            .where("tenant_id = :tenantId", { tenantId })
            .andWhere("path <@ :path", { path })
            .execute();
        return result.affected ?? 0;
    }

    async hardDeleteByPath(
        tenantId: string,
        path: string,
        manager?: EntityManager
    ): Promise<number> {
        const repo = manager ? manager.getRepository(Folders) : this.folderRepo;
        const result = await repo
            .createQueryBuilder()
            .delete()
            .from(Folders)
            .where("tenant_id = :tenantId", { tenantId })
            .andWhere("path <@ :path", { path })
            .execute();
        return result.affected ?? 0;
    }

    async updatePathForMove(
        tenantId: string,
        oldPath: string,
        newPath: string,
        updatedById: string,
        manager?: EntityManager
    ): Promise<number> {
        const repo = manager ? manager.getRepository(Folders) : this.folderRepo;
        
        // First, update the folder itself (exact path match)
        const exactMatch = await repo
            .createQueryBuilder()
            .update(Folders)
            .set({
                path: () => `(:newPath)::ltree`,
                updatedById,
            })
            .where("tenant_id = :tenantId", { tenantId })
            .andWhere("path = (:oldPath)::ltree", { oldPath })
            .setParameters({ newPath, oldPath })
            .execute();

        // Then, update all descendants (path <@ oldPath but path != oldPath)
        const descendants = await repo
            .createQueryBuilder()
            .update(Folders)
            .set({
                path: () =>
                    `(:newPath)::ltree || subpath(path, nlevel((:oldPath)::ltree))`,
                updatedById,
            })
            .where("tenant_id = :tenantId", { tenantId })
            .andWhere("path <@ (:oldPath)::ltree", { oldPath })
            .andWhere("path != (:oldPath)::ltree", { oldPath })
            .setParameters({ newPath, oldPath })
            .execute();

        return (exactMatch.affected ?? 0) + (descendants.affected ?? 0);
    }
}
