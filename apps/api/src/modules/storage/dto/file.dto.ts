import { Expose } from "class-transformer";
import {
    IsArray,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    Min,
} from "class-validator";
import { FileStatus } from "../entities/files.entity";

export class UploadRequestDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    fileName!: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    mimeType!: string;

    @IsNumber()
    @Min(1)
    size!: number;

    @IsUUID()
    folderId!: string;

    @IsOptional()
    @IsUUID()
    tenantId?: string;
}

export class UploadRequestResponseDto {
    @Expose()
    fileId!: string;

    @Expose()
    uploadUrl!: string;
}

export class ListFilesQueryDto {
    @IsUUID()
    folderId!: string;

    @IsOptional()
    @IsUUID()
    tenantId?: string;
}

export class TenantQueryDto {
    @IsOptional()
    @IsUUID()
    tenantId?: string;
}

export class FileListItemDto {
    @Expose()
    id!: string;

    @Expose()
    name!: string;

    @Expose()
    status!: FileStatus;

    @Expose()
    pages!: number;

    @Expose()
    createdAt!: Date;
}

export class FileIdParamDto {
    @IsUUID()
    fileId!: string;
}

export class ConfirmUploadDto {
    @IsOptional()
    @IsUUID()
    tenantId?: string;
}

export class FileDetailResponseDto {
    @Expose()
    id!: string;

    @Expose()
    name!: string;

    @Expose()
    type!: string;

    @Expose()
    mimeType!: string;

    @Expose()
    size!: number;

    @Expose()
    state!: FileStatus;

    @Expose()
    processing!: {
        status: FileStatus;
        pages: number;
        processedAt: Date | null;
        failedReason: string | null;
    };

    @Expose()
    folder!: {
        id: string;
        path: string;
    };

    @Expose()
    preview!: {
        available: boolean;
        pageCount: number;
    };

    @Expose()
    createdAt!: Date;

    @Expose()
    updatedAt!: Date | null;
}

export class MoveFilesDto {
    @IsArray()
    @IsUUID("4", { each: true })
    ids!: string[];

    @IsOptional()
    @IsUUID()
    targetParentId?: string | null;

    @IsOptional()
    @IsUUID()
    tenantId?: string;
}

export enum DeleteMode {
    RECYCLE = "RECYCLE",
}

export class DeleteFilesDto {
    @IsArray()
    @IsUUID("4", { each: true })
    fileIds!: string[];

    @IsOptional()
    @IsEnum(DeleteMode)
    mode?: DeleteMode;

    @IsOptional()
    @IsUUID()
    tenantId?: string;
}
