import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import llmConfig from 'src/core/config/configuration/llmConfig';

@Injectable()
export class EmbeddingService {
    private readonly logger = new Logger(EmbeddingService.name);

    constructor(
        @Inject(llmConfig.KEY)
        private readonly llm: ConfigType<typeof llmConfig>
    ) {}

    /**
     * Generates embeddings for text using the configured embedding model
     * @param text Text to generate embedding for
     * @returns Embedding vector (array of numbers)
     */
    async generateEmbedding(text: string): Promise<number[]> {
        try {
            // Use embeddingProvider if specified, otherwise fall back to main provider
            const provider = this.llm.embeddingProvider || this.llm.provider;
            
            if (provider === 'ollama') {
                return await this.generateEmbeddingOllama(text);
            } else if (provider === 'chutes-ai') {
                return await this.generateEmbeddingChutes(text);
            } else if (provider === 'openrouter') {
                return await this.generateEmbeddingOpenRouter(text);
            } else {
                throw new Error(`Unsupported embedding provider: ${provider}`);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to generate embedding: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Generates embeddings using Ollama
     */
    private async generateEmbeddingOllama(text: string): Promise<number[]> {
        const embeddingModel = this.llm.embeddingModel || 'nomic-embed-text';
        const baseUrl = this.llm.baseUrl || 'http://localhost:11434';

        const response = await fetch(`${baseUrl}/api/embeddings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: embeddingModel,
                prompt: text,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ollama embedding API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        
        if (!data.embedding || !Array.isArray(data.embedding)) {
            throw new Error('Invalid embedding response from Ollama');
        }

        return data.embedding;
    }

    /**
     * Generates embeddings for multiple texts in batch
     * Processes in batches of 100 to avoid memory/rate limit issues
     */
    async generateEmbeddings(texts: string[]): Promise<number[][]> {
        const batchSize = 100;
        const allEmbeddings: number[][] = [];
        const provider = this.llm.embeddingProvider || this.llm.provider;

        // Check if provider supports batch API calls
        const supportsBatch = provider === 'chutes-ai' || provider === 'openrouter';

        if (supportsBatch && texts.length > 1) {
            // Process in batches using batch API
            const totalBatches = Math.ceil(texts.length / batchSize);
            for (let i = 0; i < texts.length; i += batchSize) {
                const batch = texts.slice(i, i + batchSize);
                const batchNumber = Math.floor(i / batchSize) + 1;
                this.logger.log(`Processing embedding batch ${batchNumber}/${totalBatches} (${batch.length} items)`);
                
                try {
                    const batchEmbeddings = await this.generateEmbeddingsBatch(batch);
                    allEmbeddings.push(...batchEmbeddings);
                    
                    // Small delay between batches to avoid rate limiting (except for last batch)
                    if (i + batchSize < texts.length) {
                        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    this.logger.warn(`Batch embedding failed for batch ${batchNumber}, falling back to individual requests: ${errorMessage}`);
                    // Fallback to individual requests for this batch
                    const individualEmbeddings = await this.processBatchWithConcurrency(batch, 10);
                    allEmbeddings.push(...individualEmbeddings);
                }
            }
        } else {
            // Process in batches sequentially (for Ollama or when batch API fails)
            const totalBatches = Math.ceil(texts.length / batchSize);
            for (let i = 0; i < texts.length; i += batchSize) {
                const batch = texts.slice(i, i + batchSize);
                const batchNumber = Math.floor(i / batchSize) + 1;
                this.logger.log(`Processing embedding batch ${batchNumber}/${totalBatches} (${batch.length} items)`);
                
                // Process batch with concurrency limit (10 concurrent requests per batch)
                const batchEmbeddings = await this.processBatchWithConcurrency(batch, 10);
                allEmbeddings.push(...batchEmbeddings);
                
                // Small delay between batches to avoid rate limiting (except for last batch)
                if (i + batchSize < texts.length) {
                    await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay for sequential processing
                }
            }
        }

        return allEmbeddings;
    }

    /**
     * Generates embeddings for a batch using batch API (for OpenAI-compatible providers)
     */
    private async generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
        const provider = this.llm.embeddingProvider || this.llm.provider;

        if (provider === 'chutes-ai') {
            return await this.generateEmbeddingsBatchChutes(texts);
        } else if (provider === 'openrouter') {
            return await this.generateEmbeddingsBatchOpenRouter(texts);
        } else {
            throw new Error(`Batch API not supported for provider: ${provider}`);
        }
    }

    /**
     * Generates embeddings batch using Chutes.ai batch API
     */
    private async generateEmbeddingsBatchChutes(texts: string[]): Promise<number[][]> {
        const apiKey = this.llm.embeddingApiKey || this.llm.apiKey;
        const apiUrl = this.llm.chutesApiUrl || 'https://api.chutes.ai';
        const embeddingModel = this.llm.embeddingModel || 'text-embedding-ada-002';

        if (!apiKey) {
            throw new Error('Chutes.ai API key is required.');
        }

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        
        if (apiKey.startsWith('Bearer ') || apiKey.startsWith('bearer ')) {
            headers['Authorization'] = apiKey;
        } else if (apiKey.startsWith('sk-') || apiKey.length > 20) {
            headers['Authorization'] = `Bearer ${apiKey}`;
        } else {
            headers['X-API-Key'] = apiKey;
        }

        const response = await fetch(`${apiUrl}/v1/embeddings`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                model: embeddingModel,
                input: texts, // Batch input
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Chutes.ai batch embedding API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        
        if (!data.data || !Array.isArray(data.data)) {
            throw new Error('Invalid batch embedding response from Chutes.ai');
        }

        // Extract embeddings in order
        return data.data.map((item: any) => {
            if (!item.embedding || !Array.isArray(item.embedding)) {
                throw new Error('Invalid embedding in batch response from Chutes.ai');
            }
            return item.embedding;
        });
    }

    /**
     * Generates embeddings batch using OpenRouter batch API
     */
    private async generateEmbeddingsBatchOpenRouter(texts: string[]): Promise<number[][]> {
        const apiKey = this.llm.openrouterEmbeddingApiKey || this.llm.openrouterApiKey;
        const apiUrl = this.llm.openrouterApiUrl || 'https://openrouter.ai/api/v1';
        const embeddingModel = this.llm.embeddingModel || 'openai/text-embedding-3-small';

        if (!apiKey) {
            throw new Error('OpenRouter API key is required.');
        }

        const response = await fetch(`${apiUrl}/embeddings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || '',
                'X-Title': process.env.OPENROUTER_APP_NAME || 'DocSense',
            },
            body: JSON.stringify({
                model: embeddingModel,
                input: texts, // Batch input
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenRouter batch embedding API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        
        if (!data.data || !Array.isArray(data.data)) {
            throw new Error('Invalid batch embedding response from OpenRouter');
        }

        // Extract embeddings in order
        return data.data.map((item: any) => {
            if (!item.embedding || !Array.isArray(item.embedding)) {
                throw new Error('Invalid embedding in batch response from OpenRouter');
            }
            return item.embedding;
        });
    }

    /**
     * Processes a batch with limited concurrency to avoid overwhelming the API
     */
    private async processBatchWithConcurrency(texts: string[], concurrency: number): Promise<number[][]> {
        const results: number[][] = [];
        
        for (let i = 0; i < texts.length; i += concurrency) {
            const batch = texts.slice(i, i + concurrency);
            const batchResults = await Promise.all(
                batch.map(text => this.generateEmbedding(text))
            );
            results.push(...batchResults);
        }
        
        return results;
    }

    /**
     * Generates embeddings using Chutes.ai
     */
    private async generateEmbeddingChutes(text: string): Promise<number[]> {
        // Use embedding API key if available, otherwise fall back to main API key
        const apiKey = this.llm.embeddingApiKey || this.llm.apiKey;
        const apiUrl = this.llm.chutesApiUrl || 'https://api.chutes.ai';
        const embeddingModel = this.llm.embeddingModel || 'text-embedding-ada-002'; // Default embedding model

        if (!apiKey) {
            throw new Error('Chutes.ai API key is required. Set CHUTES_AI_API_KEY or CHUTES_AI_EMBEDDING_API_KEY environment variable.');
        }

        // Chutes.ai typically uses OpenAI-compatible embeddings API
        // Support both Authorization Bearer and X-API-Key
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        
        if (apiKey.startsWith('Bearer ') || apiKey.startsWith('bearer ')) {
            headers['Authorization'] = apiKey;
        } else if (apiKey.startsWith('sk-') || apiKey.length > 20) {
            headers['Authorization'] = `Bearer ${apiKey}`;
        } else {
            headers['X-API-Key'] = apiKey;
        }

        const response = await fetch(`${apiUrl}/v1/embeddings`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                model: embeddingModel,
                input: text,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Chutes.ai embedding API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        
        // Handle OpenAI-compatible response format
        const embedding = data.data?.[0]?.embedding || data.embedding;
        
        if (!embedding || !Array.isArray(embedding)) {
            throw new Error('Invalid embedding response from Chutes.ai');
        }

        return embedding;
    }

    /**
     * Generates embeddings using OpenRouter
     */
    private async generateEmbeddingOpenRouter(text: string): Promise<number[]> {
        // Use embedding API key if available, otherwise fall back to main API key
        const apiKey = this.llm.openrouterEmbeddingApiKey || this.llm.openrouterApiKey;
        const apiUrl = this.llm.openrouterApiUrl || 'https://openrouter.ai/api/v1';
        const embeddingModel = this.llm.embeddingModel || 'openai/text-embedding-3-small';

        if (!apiKey) {
            throw new Error('OpenRouter API key is required. Set OPENROUTER_API_KEY or OPENROUTER_EMBEDDING_API_KEY environment variable.');
        }

        const response = await fetch(`${apiUrl}/embeddings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || '', // Optional: for analytics
                'X-Title': process.env.OPENROUTER_APP_NAME || 'DocSense', // Optional: app name
            },
            body: JSON.stringify({
                model: embeddingModel,
                input: text,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenRouter embedding API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        
        // Handle OpenAI-compatible response format
        const embedding = data.data?.[0]?.embedding || data.embedding;
        
        if (!embedding || !Array.isArray(embedding)) {
            throw new Error('Invalid embedding response from OpenRouter');
        }

        return embedding;
    }
}
