import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { EmbeddingService } from './embedding.service';
import { LLMService, type LLMResponse } from './llm.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Files } from 'src/modules/storage/entities/files.entity';

import { QueryMode } from 'src/modules/query-history/constants/query-mode.enum';
import { QueryHistoryService } from 'src/modules/query-history/services/query-history.service';

export interface RAGQuery {
    question: string;
    tenantId?: string;
    folderId?: string;
    topK?: number; // Number of chunks to retrieve
    useHybridSearch?: boolean; // Use both keyword and semantic search
}

export interface RAGResponse {
    answer: string;
    sources: Array<{
        fileId: string;
        fileName: string;
        pageNumber: number;
        chunkIndex: number;
        snippet: string;
        score: number;
    }>;
    model: string;
    usage?: {
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
    };
}

@Injectable()
export class RAGService {
    private readonly logger = new Logger(RAGService.name);
    private readonly minKeywordTopScore = 0.2;
    private readonly minKeywordAvgScore = 0.15;
    private readonly minHybridTopScore = 0.01;
    private readonly minHybridAvgScore = 0.008;
    private readonly maxChunksPerFile = 2;

    constructor(
        private readonly es: ElasticsearchService,
        private readonly embeddingService: EmbeddingService,
        private readonly llmService: LLMService,
        @InjectRepository(Files)
        private readonly filesRepo: Repository<Files>,
        private readonly queryHistoryService: QueryHistoryService,
    ) {}

    private isBelowRelevanceThreshold(results: Array<{ score: number }>, queryMode: QueryMode): boolean {
        if (results.length === 0) return true;
        const scores = results.map(r => r.score);
        const topScore = Math.max(...scores);
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

        if (queryMode === QueryMode.HYBRID) {
            return topScore < this.minHybridTopScore || avgScore < this.minHybridAvgScore;
        }
        return topScore < this.minKeywordTopScore || avgScore < this.minKeywordAvgScore;
    }

    private selectTopResults<T extends { score: number; fileId: string }>(
        results: T[],
        limit: number
    ): T[] {
        const sorted = [...results].sort((a, b) => b.score - a.score);
        const perFileCount = new Map<string, number>();
        const selected: T[] = [];

        for (const item of sorted) {
            if (selected.length >= limit) break;
            const count = perFileCount.get(item.fileId) ?? 0;
            if (count >= this.maxChunksPerFile) continue;
            perFileCount.set(item.fileId, count + 1);
            selected.push(item);
        }
        return selected;
    }

    async answerQuestion(
        query: RAGQuery,
        userTenantId: string,
        userId: string,
    ): Promise<RAGResponse> {
        const { question, tenantId, folderId, topK, useHybridSearch = true } = query;
        const effectiveTopK = topK ?? 5;
        const searchTenantId = tenantId ?? userTenantId;
        const startTime = Date.now();

        if (!question || question.trim().length === 0) {
            throw new Error('Question cannot be empty');
        }

        this.logger.log(`Processing RAG query: "${question}"`);

        let queryEmbedding: number[] | null = null;
        if (useHybridSearch) {
            try {
                queryEmbedding = await Promise.race([
                    this.embeddingService.generateEmbedding(question),
                    new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500))
                ]) as number[] | null;
                if (queryEmbedding) {
                    this.logger.debug(`Generated query embedding (dimension: ${queryEmbedding.length})`);
                } else {
                    this.logger.debug('Embedding generation timeout, using keyword-only search');
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.logger.debug(`Embedding generation failed, using keyword-only: ${errorMessage}`);
                queryEmbedding = null;
            }
        }

        // /ask is always RAG search. useHybridSearch true + hybrid retrieval → HYBRID; else → RAG (keyword-only).
        const usedHybrid = useHybridSearch && !!queryEmbedding && queryEmbedding.length > 0;
        const queryMode: QueryMode = usedHybrid ? QueryMode.HYBRID : QueryMode.RAG;

        const searchResults = await this.hybridSearch(
            question,
            queryEmbedding,
            searchTenantId,
            folderId,
            effectiveTopK
        );

        if (searchResults.length === 0) {
            const totalTimeMs = Date.now() - startTime;
            this.queryHistoryService.logQuery({
                tenantId: searchTenantId,
                userId,
                query: question,
                response: "I couldn't find any relevant information in the documents to answer your question.",
                aborted: false,
                queryMode,
                totalChunksRetrieved: 0,
                totalTimeMs,
                documentsUsed: [],
            });
            return {
                answer: "I couldn't find any relevant information in the documents to answer your question.",
                sources: [],
                model: 'none',
            };
        }

        const fileIds = [...new Set(searchResults.map(r => r.fileId))];
        const files = await this.filesRepo.find({
            where: { id: In(fileIds), tenantId: searchTenantId },
            select: ['id', 'name', 'originalName']
        });
        const fileMap = new Map(files.map(f => [f.id, f]));

        // Filter out results for deleted files (files not found in DB due to soft delete)
        const validSearchResults = searchResults.filter(r => fileMap.has(r.fileId));

        if (validSearchResults.length === 0) {
            const totalTimeMs = Date.now() - startTime;
            this.queryHistoryService.logQuery({
                tenantId: searchTenantId,
                userId,
                query: question,
                response: "I couldn't find any relevant information in the documents to answer your question.",
                aborted: false,
                queryMode,
                totalChunksRetrieved: 0,
                totalTimeMs,
                documentsUsed: [],
            });
            return {
                answer: "I couldn't find any relevant information in the documents to answer your question.",
                sources: [],
                model: 'none',
            };
        }

        const selectedResults = this.selectTopResults(validSearchResults, effectiveTopK);
        const selectedScores = selectedResults.map(r => r.score);
        const topScore = selectedScores.length ? Math.max(...selectedScores) : 0;
        const avgScore = selectedScores.length
            ? selectedScores.reduce((a, b) => a + b, 0) / selectedScores.length
            : 0;
        this.logger.debug(`RAG retrieval stats (non-streaming): top=${topScore.toFixed(4)} avg=${avgScore.toFixed(4)} count=${selectedResults.length}`);

        if (this.isBelowRelevanceThreshold(selectedResults, queryMode)) {
            const totalTimeMs = Date.now() - startTime;
            this.queryHistoryService.logQuery({
                tenantId: searchTenantId,
                userId,
                query: question,
                response: "I couldn't find any relevant information in the documents to answer your question.",
                aborted: false,
                queryMode,
                totalChunksRetrieved: selectedResults.length,
                totalTimeMs,
                documentsUsed: [],
            });
            return {
                answer: "I couldn't find any relevant information in the documents to answer your question.",
                sources: [],
                model: 'none',
            };
        }

        const maxChunkLength = 400;
        const contextChunks = selectedResults
            .map(result => {
                const content = result.content;
                return content.length > maxChunkLength
                    ? content.substring(0, maxChunkLength) + '...'
                    : content;
            })
            .filter(Boolean);

        const sources = selectedResults.map(result => {
            const file = fileMap.get(result.fileId)!;
            return {
                fileId: result.fileId,
                fileName: file.name || file.originalName || 'Unknown',
                pageNumber: result.pageNumber,
                chunkIndex: result.chunkIndex || 0,
                snippet: result.content.substring(0, 200) + '...',
                score: result.score,
            };
        });

        this.logger.log(`Generating answer using LLM with ${contextChunks.length} context chunks (truncated)`);
        const llmResponse = await this.llmService.generateAnswer(question, contextChunks);

        const totalTimeMs = Date.now() - startTime;
        const topScores = selectedResults.map(r => r.score);
        const rerankScore = topScores.length
            ? topScores.reduce((a, b) => a + b, 0) / topScores.length
            : null;
        const documentsUsed = sources.map(s => ({
            fileId: s.fileId,
            fileName: s.fileName,
            pageNumber: s.pageNumber,
            chunkIndex: s.chunkIndex,
            score: s.score,
        }));

        this.queryHistoryService.logQuery({
            tenantId: searchTenantId,
            userId,
            query: question,
            response: llmResponse.answer,
            aborted: false,
            queryMode,
            confidence: llmResponse.confidence ?? null,
            totalChunksRetrieved: selectedResults.length,
            rerankScore,
            totalTimeMs,
            documentsUsed,
            citations: null,
        });

        return {
            answer: llmResponse.answer,
            sources,
            model: llmResponse.model,
            usage: llmResponse.usage,
        };
    }

    /**
     * Streams answer tokens as they're generated by the LLM
     */
    async *streamAnswer(
        query: RAGQuery,
        userTenantId: string,
        userId: string,
    ): AsyncGenerator<
        | { type: 'sources'; sources: RAGResponse['sources'] }
        | { type: 'token'; token: string }
        | { type: 'done'; metadata: { model: string; usage?: LLMResponse['usage'] } },
        void,
        unknown
    > {
        const { question, tenantId, folderId, topK, useHybridSearch = true } = query;
        const effectiveTopK = topK ?? 5;
        const searchTenantId = tenantId ?? userTenantId;
        const startTime = Date.now();

        if (!question || question.trim().length === 0) {
            throw new Error('Question cannot be empty');
        }

        this.logger.log(`Processing RAG query (streaming): "${question}"`);

        let queryEmbedding: number[] | null = null;
        if (useHybridSearch) {
            try {
                queryEmbedding = await Promise.race([
                    this.embeddingService.generateEmbedding(question),
                    new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500))
                ]) as number[] | null;
                if (queryEmbedding) {
                    this.logger.debug(`Generated query embedding (dimension: ${queryEmbedding.length})`);
                } else {
                    this.logger.debug('Embedding generation timeout, using keyword-only search');
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.logger.debug(`Embedding generation failed, using keyword-only: ${errorMessage}`);
                queryEmbedding = null;
            }
        }

        const usedHybrid = useHybridSearch && !!queryEmbedding && queryEmbedding.length > 0;
        const queryMode: QueryMode = usedHybrid ? QueryMode.HYBRID : QueryMode.RAG;

        const searchResults = await this.hybridSearch(
            question,
            queryEmbedding,
            searchTenantId,
            folderId,
            effectiveTopK
        );

        if (searchResults.length === 0) {
            const totalTimeMs = Date.now() - startTime;
            this.queryHistoryService.logQuery({
                tenantId: searchTenantId,
                userId,
                query: question,
                response: "I couldn't find any relevant information in the documents to answer your question.",
                aborted: false,
                queryMode,
                totalChunksRetrieved: 0,
                totalTimeMs,
                documentsUsed: [],
            });
            // Yield empty response for streaming
            yield { type: 'token', token: "I couldn't find any relevant information in the documents to answer your question." };
            yield { type: 'done', metadata: { model: 'none' } };
            return;
        }

        const fileIds = [...new Set(searchResults.map(r => r.fileId))];
        const files = await this.filesRepo.find({
            where: { id: In(fileIds), tenantId: searchTenantId },
            select: ['id', 'name', 'originalName']
        });
        const fileMap = new Map(files.map(f => [f.id, f]));

        // Filter out results for deleted files (files not found in DB due to soft delete)
        const validSearchResults = searchResults.filter(r => fileMap.has(r.fileId));

        if (validSearchResults.length === 0) {
            const totalTimeMs = Date.now() - startTime;
            this.queryHistoryService.logQuery({
                tenantId: searchTenantId,
                userId,
                query: question,
                response: "I couldn't find any relevant information in the documents to answer your question.",
                aborted: false,
                queryMode,
                totalChunksRetrieved: 0,
                totalTimeMs,
                documentsUsed: [],
            });
            yield { type: 'token', token: "I couldn't find any relevant information in the documents to answer your question." };
            yield { type: 'done', metadata: { model: 'none' } };
            return;
        }

        const selectedResults = this.selectTopResults(validSearchResults, effectiveTopK);

        if (this.isBelowRelevanceThreshold(selectedResults, queryMode)) {
            const totalTimeMs = Date.now() - startTime;
            this.queryHistoryService.logQuery({
                tenantId: searchTenantId,
                userId,
                query: question,
                response: "I couldn't find any relevant information in the documents to answer your question.",
                aborted: false,
                queryMode,
                totalChunksRetrieved: selectedResults.length,
                totalTimeMs,
                documentsUsed: [],
            });
            yield { type: 'token', token: "I couldn't find any relevant information in the documents to answer your question." };
            yield { type: 'done', metadata: { model: 'none' } };
            return;
        }

        const maxChunkLength = 400;
        const contextChunks = selectedResults
            .map(result => {
                const content = result.content;
                return content.length > maxChunkLength
                    ? content.substring(0, maxChunkLength) + '...'
                    : content;
            })
            .filter(Boolean);

        const sources = selectedResults.map(result => {
            const file = fileMap.get(result.fileId)!;
            return {
                fileId: result.fileId,
                fileName: file.name || file.originalName || 'Unknown',
                pageNumber: result.pageNumber,
                chunkIndex: result.chunkIndex || 0,
                snippet: result.content.substring(0, 200) + '...',
                score: result.score,
            };
        });

        // Send sources first
        yield { type: 'sources', sources };

        let queryLogged = false;
        try {
            // Stream LLM tokens
            for await (const chunk of this.llmService.streamAnswer(question, contextChunks)) {
                if (chunk.type === 'token') {
                    yield { type: 'token', token: chunk.token };
                } else if (chunk.type === 'done') {
                    const finalResponse = chunk.response;
                    const totalTimeMs = Date.now() - startTime;
                    const topScores = selectedResults.map(r => r.score);
                    const rerankScore = topScores.length
                        ? topScores.reduce((a, b) => a + b, 0) / topScores.length
                        : null;
                    const documentsUsed = sources.map(s => ({
                        fileId: s.fileId,
                        fileName: s.fileName,
                        pageNumber: s.pageNumber,
                        chunkIndex: s.chunkIndex,
                        score: s.score,
                    }));

                    // Log query history before yielding "done" so controller doesn't cancel it
                    this.queryHistoryService.logQuery({
                        tenantId: searchTenantId,
                        userId,
                        query: question,
                        response: finalResponse.answer,
                        aborted: false,
                        queryMode,
                        confidence: finalResponse.confidence ?? null,
                        totalChunksRetrieved: selectedResults.length,
                        rerankScore,
                        totalTimeMs,
                        documentsUsed,
                        citations: null,
                    });
                    queryLogged = true;

                    yield {
                        type: 'done',
                        metadata: {
                            model: finalResponse.model,
                            usage: finalResponse.usage,
                        },
                    };
                }
            }
        } finally {
            if (!queryLogged) {
                const totalTimeMs = Date.now() - startTime;
                const topScores = selectedResults.map(r => r.score);
                const rerankScore = topScores.length
                    ? topScores.reduce((a, b) => a + b, 0) / topScores.length
                    : null;
                const documentsUsed = sources.map(s => ({
                    fileId: s.fileId,
                    fileName: s.fileName,
                    pageNumber: s.pageNumber,
                    chunkIndex: s.chunkIndex,
                    score: s.score,
                }));

                // Log partial query on abort/disconnect
                this.queryHistoryService.logQuery({
                    tenantId: searchTenantId,
                    userId,
                    query: question,
                    response: null,
                    aborted: true,
                    queryMode,
                    confidence: null,
                    totalChunksRetrieved: selectedResults.length,
                    rerankScore,
                    totalTimeMs,
                    documentsUsed,
                    citations: null,
                });
            }
        }
    }

    /**
     * Performs hybrid search combining keyword and semantic (vector) search
     */
    private async hybridSearch(
        query: string,
        queryEmbedding: number[] | null,
        tenantId: string,
        folderId?: string,
        topK: number = 5
    ): Promise<Array<{
        fileId: string;
        pageNumber: number;
        chunkIndex: number;
        content: string;
        score: number;
    }>> {

        try {
            // If we have embeddings, try hybrid search (knn + keyword)
            // Otherwise, fall back to keyword-only search
            let response: any;
            
            if (queryEmbedding && queryEmbedding.length > 0) {
                try {
                    // Try knn query for semantic search (Elasticsearch 8.0+)
                    // Reduced num_candidates for faster search (topK * 5 instead of topK * 10)
                    const knnParams: any = {
                        index: 'doc_pages',
                        knn: {
                            field: 'embedding',
                            query_vector: queryEmbedding,
                            k: topK,
                            num_candidates: Math.min(topK * 10, 100), // Higher recall for better semantic hits
                            filter: {
                                bool: {
                                    filter: [
                                        {
                                            match: {
                                                tenantId: tenantId
                                            }
                                        }
                                    ]
                                }
                            }
                        },
                        size: topK,
                        _source: ['fileId', 'pageNumber', 'chunkIndex', 'content'],
                    };

                    // Keyword search for hybrid approach (optimized for speed)
                    const keywordParams: any = {
                        index: 'doc_pages',
                        query: {
                            bool: {
                                should: [
                                    {
                                        match_phrase: {
                                            content: {
                                                query,
                                                slop: 2,
                                                boost: 2,
                                            }
                                        }
                                    },
                                    {
                                        match: {
                                            content: {
                                                query,
                                                operator: 'and',
                                                fuzziness: 'AUTO',
                                                minimum_should_match: '85%',
                                            }
                                        }
                                    }
                                ],
                                minimum_should_match: 1,
                                filter: [
                                    {
                                        match: {
                                            tenantId: tenantId
                                        }
                                    }
                                ]
                            }
                        },
                        size: topK,
                        min_score: 0.2,
                        _source: ['fileId', 'pageNumber', 'chunkIndex', 'content'],
                        // Add timeout to prevent slow queries
                        timeout: '5s',
                    };

                    // Execute both searches in parallel
                    const [knnResponse, keywordResponse] = await Promise.all([
                        this.es.search(knnParams).catch((err) => {
                            this.logger.debug(`KNN search failed (embeddings may not exist yet): ${err}`);
                            return null;
                        }),
                        this.es.search(keywordParams)
                    ]);

                    // Combine results if both succeeded
                    if (knnResponse) {
                        const knnHits = (knnResponse as any).body?.hits?.hits || (knnResponse as any).hits?.hits || [];
                        const keywordHits = (keywordResponse as any).body?.hits?.hits || (keywordResponse as any).hits?.hits || [];
                        
                        // Combine with reciprocal rank fusion (RRF) for better balance
                        const rrfK = 60;
                        const combined = new Map<string, { hit: any; score: number }>();

                        knnHits.forEach((hit: any, idx: number) => {
                            const key = `${hit._source?.fileId}-${hit._source?.pageNumber}-${hit._source?.chunkIndex}`;
                            const entry = combined.get(key) ?? { hit, score: 0 };
                            entry.score += 1 / (rrfK + idx + 1);
                            combined.set(key, entry);
                        });

                        keywordHits.forEach((hit: any, idx: number) => {
                            const key = `${hit._source?.fileId}-${hit._source?.pageNumber}-${hit._source?.chunkIndex}`;
                            const entry = combined.get(key) ?? { hit, score: 0 };
                            entry.score += 1 / (rrfK + idx + 1);
                            // Prefer keyword hit content if available
                            entry.hit = entry.hit || hit;
                            combined.set(key, entry);
                        });

                        const uniqueHits = Array.from(combined.values()).map((entry) => ({
                            ...entry.hit,
                            _score: entry.score,
                        }));

                        uniqueHits.sort((a: any, b: any) => (b._score || 0) - (a._score || 0));
                        response = { hits: { hits: uniqueHits.slice(0, topK) } };
                    } else {
                        // Fall back to keyword-only if knn failed
                        this.logger.debug('Using keyword-only search (embeddings not available)');
                        response = keywordResponse;
                    }
                } catch (error) {
                    // Fall back to keyword-only search on any error
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    this.logger.warn(`Hybrid search failed, using keyword-only: ${errorMessage}`);
                    response = await this.es.search({
                        index: 'doc_pages',
                        query: {
                            bool: {
                                must: [
                                    {
                                        match: {
                                            content: {
                                                query,
                                                operator: 'and',
                                                fuzziness: 'AUTO',
                                                minimum_should_match: '85%',
                                            }
                                        }
                                    }
                                ],
                                filter: [
                                    {
                                        match: {
                                            tenantId: tenantId
                                        }
                                    }
                                ]
                            }
                        },
                        size: topK,
                        min_score: 0.2,
                        _source: ['fileId', 'pageNumber', 'chunkIndex', 'content'],
                    });
                }
            } else {
                // Keyword-only search (optimized for speed)
                response = await this.es.search({
                    index: 'doc_pages',
                    query: {
                        bool: {
                            should: [
                                {
                                    match_phrase: {
                                        content: {
                                            query,
                                            slop: 2,
                                            boost: 2,
                                        }
                                    }
                                },
                                {
                                    match: {
                                        content: {
                                            query,
                                            operator: 'and',
                                            fuzziness: 'AUTO',
                                            minimum_should_match: '85%',
                                        }
                                    }
                                }
                            ],
                            minimum_should_match: 1,
                            filter: [
                                {
                                    match: {
                                        tenantId: tenantId
                                    }
                                }
                            ]
                        }
                    },
                    size: topK,
                    min_score: 0.2,
                    _source: ['fileId', 'pageNumber', 'chunkIndex', 'content'],
                    timeout: '5s',
                });
            }

            const hits = response.body?.hits || response.hits;
            let hitsList = hits?.hits || [];

            // Fallback: if strict query returns nothing, try a looser keyword match
            if (hitsList.length === 0) {
                const fallbackResponse: any = await this.es.search({
                    index: 'doc_pages',
                    query: {
                        bool: {
                            should: [
                                {
                                    match: {
                                        content: {
                                            query,
                                            operator: 'or',
                                            fuzziness: 'AUTO',
                                            minimum_should_match: '70%',
                                        }
                                    }
                                }
                            ],
                            minimum_should_match: 1,
                            filter: [
                                {
                                    match: {
                                        tenantId: tenantId
                                    }
                                }
                            ]
                        }
                    },
                    size: topK,
                    min_score: 0.1,
                    _source: ['fileId', 'pageNumber', 'chunkIndex', 'content'],
                    timeout: '5s',
                });
                const fallbackHits = fallbackResponse.body?.hits || fallbackResponse.hits;
                hitsList = fallbackHits?.hits || [];
            }

            // Filter by folderId if specified (application layer)
            let results = hitsList.map((hit: any) => ({
                fileId: hit._source?.fileId,
                pageNumber: hit._source?.pageNumber || 0,
                chunkIndex: hit._source?.chunkIndex || 0,
                content: hit._source?.content || '',
                score: hit._score || 0,
            }));

            if (folderId) {
                const fileIds = [...new Set(results.map((r:any) => r.fileId))];
                const files = await this.filesRepo.find({
                    where: {
                        id: In(fileIds),
                        tenantId,
                        folderId
                    },
                    select: ['id']
                });
                const allowedFileIds = new Set(files.map(f => f.id));
                results = results.filter((r:any) => allowedFileIds.has(r.fileId));
            }

            return results;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Hybrid search failed: ${errorMessage}`);
            throw error;
        }
    }
}
