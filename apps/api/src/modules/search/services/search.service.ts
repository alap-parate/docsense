import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Files } from 'src/modules/storage/entities/files.entity';
import { SearchQueryDto, SearchMatchDto, SearchResponseDto } from '../dto/search.dto';
import { QueryMode } from 'src/modules/query-history/constants/query-mode.enum';
import { QueryHistoryService } from 'src/modules/query-history/services/query-history.service';

@Injectable()
export class SearchService {
    private readonly logger = new Logger(SearchService.name);

    constructor(
        private readonly es: ElasticsearchService,
        @InjectRepository(Files)
        private readonly filesRepo: Repository<Files>,
        private readonly queryHistoryService: QueryHistoryService,
    ) {}

    async search(
        query: SearchQueryDto,
        tenantId: string,
        userId: string,
    ): Promise<SearchResponseDto> {
        const { q, folderId, limit = 20, offset = 0 } = query;
        const searchTenantId = query.tenantId ?? tenantId;
        const startTime = Date.now();

        if (!q || q.trim().length === 0) {
            return {
                matches: [],
                total: 0,
                query: q,
            };
        }

        // If tenantId is empty, skip tenantId filter for testing
        if (!searchTenantId || searchTenantId.trim().length === 0) {
            this.logger.warn(`Empty tenantId provided, skipping tenantId filter for query: "${q}"`);
        }

        try {
            // Build Elasticsearch query with phrase matching prioritized
            // First try to match phrases, then fall back to individual words
            const queryTerms = q.trim().split(/\s+/).filter(term => term.length > 0);
            const hasMultipleTerms = queryTerms.length > 1;
            
            const esQuery: any = {
                bool: {
                    must: [
                        // All terms must match (required)
                        {
                            match: {
                                content: {
                                    query: q,
                                    operator: 'and', // All terms must match
                                    fuzziness: 'AUTO',
                                }
                            }
                        }
                    ],
                    should: [
                        // Phrase match (boost) - matches exact phrase for higher scoring
                        ...(hasMultipleTerms ? [{
                            match_phrase: {
                                content: {
                                    query: q,
                                    boost: 3.0, // Higher boost for phrase matches
                                }
                            }
                        }] : [])
                    ],
                }
            };

            // Add tenantId filter only if tenantId is provided
            // Use match instead of term because tenantId might be analyzed as text
            // If it's stored as keyword, both work, but match is more flexible
            if (searchTenantId && searchTenantId.trim().length > 0) {
                esQuery.bool.filter = [
                    {
                        match: {
                            tenantId: searchTenantId
                        }
                    }
                ];
            }

            // Add folder filter if specified
            if (folderId) {
                // We need to get fileIds that belong to this folder
                // But we can't filter directly on folderId in ES since it's not indexed
                // Instead, we'll filter after getting results, or we could add folderId to ES index
                // For now, let's filter in the application layer after getting file metadata
            }

            const searchParams: any = {
                index: 'doc_pages',
                query: esQuery,
                highlight: {
                    fields: {
                        content: {
                            fragment_size: 200,
                            number_of_fragments: 3,
                            pre_tags: ['<mark>'],
                            post_tags: ['</mark>'],
                            type: 'unified', // Better phrase highlighting
                            phrase_limit: 50, // Limit phrase matches for performance
                        }
                    },
                    require_field_match: false, // Highlight even if phrase doesn't match exactly
                },
                size: limit,
                from: offset,
                sort: [
                    { _score: { order: 'desc' } },
                    { pageNumber: { order: 'asc' } }
                ]
            };

            this.logger.debug(`Searching Elasticsearch with query: ${JSON.stringify(searchParams)}`);
            
            // First, let's check what's actually in the index
            try {
                const countResponse: any = await this.es.count({ index: 'doc_pages' });
                this.logger.debug(`Total documents in doc_pages index: ${countResponse.count || countResponse.body?.count || 'unknown'}`);
            } catch (countError) {
                this.logger.warn(`Failed to count documents in index: ${countError}`);
            }
            
            // Try a simple match query without tenantId filter to see if any data exists
            const testQuery: any = {
                index: 'doc_pages',
                query: {
                    match: {
                        content: {
                            query: q,
                            operator: 'and'
                        }
                    }
                },
                size: 5
            };
            
            try {
                const testResponse: any = await this.es.search(testQuery);
                const testHits = testResponse.body?.hits || testResponse.hits;
                const testHitsList = testHits?.hits || [];
                this.logger.debug(`Test query (without tenantId filter) found ${testHitsList.length} hits`);
                if (testHitsList.length > 0) {
                    const sampleHit = testHitsList[0];
                    this.logger.debug(`Sample hit tenantId: ${sampleHit._source?.tenantId}, query tenantId: ${searchTenantId}`);
                    this.logger.debug(`Sample hit fields: ${JSON.stringify(Object.keys(sampleHit._source || {}))}`);
                }
            } catch (testError) {
                this.logger.warn(`Test query failed: ${testError}`);
            }
            
            const response: any = await this.es.search(searchParams);

            this.logger.debug(`Elasticsearch response structure: ${JSON.stringify(Object.keys(response))}`);
            this.logger.debug(`Response body keys: ${response.body ? JSON.stringify(Object.keys(response.body)) : 'no body'}`);
            this.logger.debug(`Response hits keys: ${response.hits ? JSON.stringify(Object.keys(response.hits)) : 'no hits'}`);

            // NestJS ElasticsearchService wraps the response, access via body property
            const hits = response.body?.hits || response.hits;
            const hitsList = hits?.hits || [];
            // Handle both { value: number, relation: string } and number formats for total
            const totalValue = typeof hits?.total === 'object' ? hits.total.value : (hits?.total || 0);
            
            this.logger.debug(`Found ${hitsList.length} hits, total: ${totalValue}`);

            // Extract fileIds from results
            const fileIds = [...new Set(
                hitsList.map((hit: any) => hit._source?.fileId).filter(Boolean)
            )];

            if (fileIds.length === 0) {
                this.logger.warn(`No fileIds found in Elasticsearch results for query: "${q}", tenantId: ${searchTenantId}`);
                const totalTimeMs = Date.now() - startTime;
                this.queryHistoryService.logQuery({
                    tenantId: searchTenantId,
                    userId,
                    query: q,
                    queryMode: QueryMode.KEYWORD,
                    totalChunksRetrieved: 0,
                    totalTimeMs,
                    documentsUsed: [],
                });
                return {
                    matches: [],
                    total: totalValue,
                    query: q,
                };
            }

            this.logger.debug(`Found ${fileIds.length} unique fileIds: ${fileIds.slice(0, 5).join(', ')}...`);

            // Fetch file metadata from database
            const files = await this.filesRepo.find({
                where: {
                    id: In(fileIds),
                    tenantId: searchTenantId
                },
                select: ['id', 'name', 'originalName', 'folderId']
            });

            const fileMap = new Map(files.map(f => [f.id, f]));

            // Filter by folderId if specified
            const filteredFileIds = folderId 
                ? files.filter(f => f.folderId === folderId).map(f => f.id)
                : fileIds;

            // Build matches with file metadata
            const matches: SearchMatchDto[] = hitsList
                .filter((hit: any) => filteredFileIds.includes(hit._source?.fileId))
                .map((hit: any) => {
                    const file = fileMap.get(hit._source?.fileId);
                    if (!file) {
                        return null;
                    }

                    // Get highlighted snippet or fallback to first 200 chars of content
                    const highlightedSnippet = hit.highlight?.content?.[0];
                    const snippet = highlightedSnippet 
                        ? highlightedSnippet
                        : (hit._source?.content?.substring(0, 200) || '') + '...';

                    return {
                        fileId: hit._source.fileId,
                        fileName: file.name || file.originalName,
                        pageNumber: hit._source.pageNumber,
                        snippet,
                        score: hit._score || 0,
                    };
                })
                .filter((match: SearchMatchDto | null): match is SearchMatchDto => match !== null);

            this.logger.debug(`Returning ${matches.length} matches after file metadata join`);

            const totalTimeMs = Date.now() - startTime;
            const topScores = matches.map((m) => m.score);
            const rerankScore = topScores.length
                ? topScores.reduce((a, b) => a + b, 0) / topScores.length
                : null;
            const documentsUsed = matches.map((m) => ({
                fileId: m.fileId,
                fileName: m.fileName,
                pageNumber: m.pageNumber,
                score: m.score,
            }));
            this.queryHistoryService.logQuery({
                tenantId: searchTenantId,
                userId,
                query: q,
                queryMode: QueryMode.KEYWORD,
                totalChunksRetrieved: matches.length,
                rerankScore,
                totalTimeMs,
                documentsUsed,
            });

            return {
                matches,
                total: totalValue,
                query: q,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(
                `Elasticsearch search failed for query "${q}": ${errorMessage}`,
                errorStack
            );
            throw error;
        }
    }
}