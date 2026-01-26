import { Expose, Transform } from "class-transformer";
import {
    IsArray,
    IsBoolean,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
} from "class-validator";

export class CreateFolderDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(120)
    name!: string;

    @IsOptional()
    @IsUUID()
    parentId?: string | null;

    @IsOptional()
    @IsUUID()
    tenantId?: string;
}

export class CreateFolderResponseDto {
    @Expose()
    id!: string;

    @Expose()
    path!: string;
}

export class ListFolderQueryDto {
    @IsOptional()
    @IsUUID()
    parentId?: string | null;

    @IsOptional()
    @IsUUID()
    tenantId?: string;

    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => value === 'true' || value === true)
    deleted?: boolean;
}

export class FolderListItemDto {
    @Expose()
    id!: string;

    @Expose()
    name!: string;

    @Expose()
    hasChildren!: boolean;

    @Expose()
    children!: { id: string; name: string }[];
}

export class FolderIdParamDto {
    @IsUUID()
    folderId!: string;
}

export class RenameFolderDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(120)
    name!: string;
}

export class FolderDetailResponseDto {
    @Expose()
    id!: string;

    @Expose()
    name!: string;

    @Expose()
    parentId!: string | null;

    @Expose()
    path!: string;

    @Expose()
    depth!: number;

    @Expose()
    stats!: {
        folderCount: number;
        fileCount: number;
    };

    @Expose()
    createdAt!: Date;

    @Expose()
    updatedAt!: Date | null;
}

export class MoveFoldersDto {
    @IsArray()
    @IsUUID("4", { each: true })
    folderIds!: string[];

    @IsOptional()
    @IsUUID()
    targetParentId?: string | null;

    @IsOptional()
    @IsUUID()
    tenantId?: string;
}

export class DeleteFoldersDto {
    @IsArray()
    @IsUUID("4", { each: true })
    folderIds!: string[];

    @IsOptional()
    @IsUUID()
    tenantId?: string;
}
