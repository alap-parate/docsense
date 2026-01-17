import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, In, Repository } from "typeorm";
import { DocumentPages } from "../entities/document-pages.entity";

@Injectable()
export class DocumentPagesRepository {
    constructor(
        @InjectRepository(DocumentPages)
        private readonly documentPagesRepo: Repository<DocumentPages>,
    ) {}

    async softDeletePages(
        tenantId: string,
        fileIds: string[],
        manager?: EntityManager
    ): Promise<number> {
        if (fileIds.length === 0) {
            return 0;
        }
        const repo = manager ? manager.getRepository(DocumentPages) : this.documentPagesRepo;
        const result = await repo
            .createQueryBuilder()
            .softDelete()
            .where("tenant_id = :tenantId", { tenantId })
            .andWhere("file_id IN (:...fileIds)", { fileIds })
            .execute();
        return result.affected ?? 0;
    }

    async restorePages(
        tenantId: string,
        fileIds: string[],
        manager?: EntityManager
    ): Promise<number> {
        if (fileIds.length === 0) {
            return 0;
        }
        const repo = manager ? manager.getRepository(DocumentPages) : this.documentPagesRepo;
        
        // Find soft-deleted records first
        const softDeleted = await repo
            .createQueryBuilder('page')
            .where("page.tenant_id = :tenantId", { tenantId })
            .andWhere("page.file_id IN (:...fileIds)", { fileIds })
            .withDeleted() // Include soft-deleted records
            .andWhere("page.deletedAt IS NOT NULL")
            .select("page.id")
            .getMany();
        
        if (softDeleted.length === 0) {
            return 0;
        }
        
        // Use restore() with array of IDs for bulk restore
        const ids = softDeleted.map(p => p.id);
        await repo.restore(ids);
        
        return ids.length;
    }

    async countByFileIds(
        tenantId: string,
        fileIds: string[]
    ): Promise<Map<string, number>> {
        if (fileIds.length === 0) {
            return new Map();
        }
        
        const results = await this.documentPagesRepo
            .createQueryBuilder("page")
            .select("page.file_id", "fileId")
            .addSelect("COUNT(page.id)", "count")
            .where("page.tenant_id = :tenantId", { tenantId })
            .andWhere("page.file_id IN (:...fileIds)", { fileIds })
            .groupBy("page.file_id")
            .getRawMany<{ fileId: string; count: string }>();

        const map = new Map<string, number>();
        for (const row of results) {
            map.set(row.fileId, parseInt(row.count, 10));
        }
        return map;
    }

    async countByFileId(fileId: string): Promise<number> {
        return await this.documentPagesRepo.count({ where: { fileId } });
    }
}
