import { IsString, IsOptional, IsUUID, IsInt, Min, Max, IsBoolean } from 'class-validator';

export class RAGQueryDto {
    @IsString()
    question!: string;

    @IsOptional()
    @IsUUID()
    tenantId?: string;

    @IsOptional()
    @IsUUID()
    folderId?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(20)
    topK?: number; // Number of chunks to retrieve (defaults to 5 if not provided)

    @IsOptional()
    @IsBoolean()
    useHybridSearch?: boolean = true;
}

export class RAGResponseDto {
    answer!: string;
    sources!: Array<{
        fileId: string;
        fileName: string;
        pageNumber: number;
        chunkIndex: number;
        snippet: string;
        score: number;
    }>;
    model!: string;
    usage?: {
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
    };
}
