import {
    Controller,
    Post,
    Body,
    UseGuards,
    HttpCode,
    HttpStatus,
    Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from 'src/core/auth/guards/auth-guard';
import { TenantGuard } from 'src/modules/tenants/guards/tenant-guard';
import { CurrentUser } from 'src/shared/decorators/current-user.decorator';
import type { AuthUser } from 'src/shared/types/auth-user.type';
import { RAGService } from './services/rag.service';
import { RAGQueryDto, RAGResponseDto } from './dto/rag.dto';

@Controller({
    version: '1',
    path: 'rag',
})
@UseGuards(AuthGuard, TenantGuard)
export class RAGController {
    constructor(private readonly ragService: RAGService) {}

    @Post('ask')
    @HttpCode(HttpStatus.OK)
    async askQuestion(
        @Body() dto: RAGQueryDto,
        @CurrentUser() user: AuthUser,
        @Res() res: Response,
    ): Promise<void> {
        const tenantId = user.tenantId ?? '';
        const userId = user.id ?? '';

        // Set SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

        try {
            let sourcesSent = false;

            for await (const chunk of this.ragService.streamAnswer(dto, tenantId, userId)) {
                if (chunk.type === 'sources') {
                    // Send sources as JSON event
                    res.write(`event: sources\n`);
                    res.write(`data: ${JSON.stringify({ sources: chunk.sources })}\n\n`);
                    sourcesSent = true;
                } else if (chunk.type === 'token') {
                    // Send token as text event
                    res.write(`event: token\n`);
                    res.write(`data: ${JSON.stringify({ token: chunk.token })}\n\n`);
                } else if (chunk.type === 'done') {
                    // Send final metadata
                    res.write(`event: done\n`);
                    res.write(`data: ${JSON.stringify({ metadata: chunk.metadata })}\n\n`);
                    res.end();
                    return;
                }
            }

            // If we exit the loop without 'done', end the stream
            if (!sourcesSent) {
                res.write(`event: error\n`);
                res.write(`data: ${JSON.stringify({ error: 'Stream ended unexpectedly' })}\n\n`);
            }
            res.end();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            res.write(`event: error\n`);
            res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
            res.end();
        }
    }
}
