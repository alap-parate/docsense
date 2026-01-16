import { Expose } from "class-transformer";
import { IsArray, IsOptional, IsUUID } from "class-validator";
import { PaginationQueryDto } from "src/shared/dto/pagination-query.dto";

export class RecycleBinQueryDto extends PaginationQueryDto {
    @IsOptional()
    @IsUUID()
    tenantId?: string;
}

export class RecycleBinItemDto {
    @Expose()
    id!: string;

    @Expose()
    type!: "FOLDER" | "FILE";

    @Expose()
    name!: string;

    @Expose()
    originalParentId?: string | null;

    @Expose()
    originalFolderId?: string | null;

    @Expose()
    recycledAt!: Date;
}

export class RecycleBinRestoreDto {
    @IsArray()
    @IsUUID("4", { each: true })
    ids!: string[];

    @IsOptional()
    @IsUUID()
    tenantId?: string;
}

export class RecycleBinPermanentDeleteDto {
    @IsArray()
    @IsUUID("4", { each: true })
    ids!: string[];

    @IsOptional()
    @IsUUID()
    tenantId?: string;
}
