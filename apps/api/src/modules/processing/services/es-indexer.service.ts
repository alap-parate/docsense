import { Injectable, Logger } from "@nestjs/common";
import { ElasticsearchService } from "@nestjs/elasticsearch";
import { ExtractedPage } from "./pdf-extractor.service";

@Injectable()
export class EsIndexerService {
    private readonly logger = new Logger(EsIndexerService.name);

    constructor(
        private readonly es: ElasticsearchService
    ) {}

    async indexPages(tenantId: string, fileId: string, pages: ExtractedPage[]): Promise<void> {
        if (pages.length === 0) {
            this.logger.warn(`No pages to index for file ${fileId}`);
            return;
        }

        const body = pages.flatMap(p => [
            { index: { _index: 'doc_pages' } },
            {
                tenantId,
                fileId,
                pageNumber: p.pageNumber,
                content: p.text
            }
        ]);

        try {
            const response = await this.es.bulk({ 
                refresh: false, 
                body 
            });

            if (response.errors) {
                const failedItems = response.items.filter((item: any) => item.index?.error);
                if (failedItems.length > 0) {
                    this.logger.warn(
                        `Failed to index ${failedItems.length} out of ${pages.length} pages for file ${fileId}`
                    );
                    failedItems.forEach((item: any) => {
                        this.logger.error(`Index error: ${JSON.stringify(item.index?.error)}`);
                    });
                } else {
                    this.logger.log(`Successfully indexed ${pages.length} pages for file ${fileId}`);
                }
            } else {
                this.logger.log(`Successfully indexed ${pages.length} pages for file ${fileId}`);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(
                `Elasticsearch bulk indexing failed for file ${fileId}: ${errorMessage}`,
                errorStack
            );
            throw error;
        }
    }
}