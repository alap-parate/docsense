import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from "@nestjs/common";
import { AuthGuard } from "src/core/auth/guards/auth-guard";
import { CurrentUser } from "src/shared/decorators/current-user.decorator";
import type { AuthUser } from "src/shared/types/auth-user.type";
import { RAGService } from "./services/rag.service";
import { RAGQueryDto, RAGResponseDto } from "./dto/rag.dto";

@Controller({
    version: "1",
    path: "rag",
})
@UseGuards(AuthGuard)
export class RAGController {
    constructor(
        private readonly ragService: RAGService
    ) {}

    @Post("ask")
    @HttpCode(HttpStatus.OK)
    async askQuestion(
        @Body() dto: RAGQueryDto,
        @CurrentUser() user: AuthUser
    ): Promise<RAGResponseDto> {
        const tenantId = user.tenantId ?? '';
        return this.ragService.answerQuestion(dto, tenantId, user.id);
    }
}
