import { Injectable, Logger } from "@nestjs/common";
import { ElasticsearchService } from "@nestjs/elasticsearch";
import { ExtractedPage } from "./pdf-extractor.service";
import { EmbeddingService } from "src/modules/rag/services/embedding.service";
import { ChunkingService } from "src/modules/rag/services/chunking.service";

@Injectable()
export class EsIndexerService {
    private readonly logger = new Logger(EsIndexerService.name);

    constructor(
        private readonly es: ElasticsearchService,
        private readonly embeddingService: EmbeddingService,
        private readonly chunkingService: ChunkingService
    ) {}

    async indexPages(
        tenantId: string,
        fileId: string,
        pages: ExtractedPage[],
    ): Promise<{ embeddingMs: number; indexingMs: number }> {
        const result = { embeddingMs: 0, indexingMs: 0 };
        if (pages.length === 0) {
            this.logger.warn(`No pages to index for file ${fileId}`);
            return result;
        }

        this.logger.log(`Indexing ${pages.length} pages for file ${fileId} with embeddings`);

        // Split pages into semantic chunks and generate embeddings
        const allChunks: Array<{
            text: string;
            pageNumber: number;
            chunkIndex: number;
            embedding?: number[];
        }> = [];

        for (const page of pages) {
            const chunks = this.chunkingService.splitIntoChunks(
                page.text,
                page.pageNumber,
                1000, // chunk size
                200   // overlap
            );

            for (const chunk of chunks) {
                allChunks.push({
                    text: chunk.text,
                    pageNumber: chunk.pageNumber,
                    chunkIndex: chunk.chunkIndex,
                });
            }
        }

        this.logger.log(`Split into ${allChunks.length} chunks, generating embeddings in batches of 100...`);

        // Generate embeddings for all chunks in batches
        const embeddingStart = Date.now();
        try {
            const texts = allChunks.map(chunk => chunk.text);
            const embeddings = await this.embeddingService.generateEmbeddings(texts);
            result.embeddingMs = Date.now() - embeddingStart;
            this.logger.log(`Generated ${embeddings.length} embeddings in ${(result.embeddingMs / 1000).toFixed(2)}s`);

            // Attach embeddings to chunks
            for (let i = 0; i < allChunks.length; i++) {
                if (embeddings[i] && embeddings[i].length > 0) {
                    allChunks[i].embedding = embeddings[i];
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorStack = error instanceof Error ? error.stack : undefined;
            result.embeddingMs = Date.now() - embeddingStart;
            this.logger.error(
                `Failed to generate embeddings for file ${fileId}: ${errorMessage}`,
                errorStack
            );
            this.logger.warn(`Indexing ${allChunks.length} chunks without embeddings. Keyword search will still work.`);
        }

        // Build bulk index body
        const body = allChunks.flatMap(chunk => {
            const doc: any = {
                tenantId,
                fileId,
                pageNumber: chunk.pageNumber,
                chunkIndex: chunk.chunkIndex,
                content: chunk.text,
            };

            // Add embedding if available
            if (chunk.embedding && chunk.embedding.length > 0) {
                doc.embedding = chunk.embedding;
            }

            return [
                { index: { _index: 'doc_pages' } },
                doc
            ];
        });

        const indexingStart = Date.now();
        try {
            const response = await this.es.bulk({ 
                refresh: false, 
                body 
            });
            result.indexingMs = Date.now() - indexingStart;

            if (response.errors) {
                const failedItems = response.items.filter((item: any) => item.index?.error);
                if (failedItems.length > 0) {
                    this.logger.warn(
                        `Failed to index ${failedItems.length} out of ${allChunks.length} chunks for file ${fileId}`
                    );
                    failedItems.forEach((item: any) => {
                        this.logger.error(`Index error: ${JSON.stringify(item.index?.error)}`);
                    });
                } else {
                    this.logger.log(`Successfully indexed ${allChunks.length} chunks for file ${fileId}`);
                }
            } else {
                this.logger.log(`Successfully indexed ${allChunks.length} chunks for file ${fileId}`);
            }
        } catch (error) {
            result.indexingMs = Date.now() - indexingStart;
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(
                `Elasticsearch bulk indexing failed for file ${fileId}: ${errorMessage}`,
                errorStack
            );
            throw error;
        }
        return result;
    }
}