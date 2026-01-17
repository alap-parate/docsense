import { IsString, IsOptional, IsUUID, Min, Max, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchQueryDto {
    @IsString()
    q!: string;

    @IsOptional()
    @IsUUID()
    tenantId?: string;

    @IsOptional()
    @IsUUID()
    folderId?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 20;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    offset?: number = 0;
}

export class SearchMatchDto {
    fileId!: string;
    fileName!: string;
    pageNumber!: number;
    snippet!: string;
    score!: number;
}

export class SearchResponseDto {
    matches!: SearchMatchDto[];
    total!: number;
    query!: string;
}