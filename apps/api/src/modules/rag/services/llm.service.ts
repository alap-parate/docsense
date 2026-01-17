import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import llmConfig from 'src/core/config/configuration/llmConfig';

export interface LLMResponse {
    answer: string;
    model: string;
    usage?: {
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
    };
}

@Injectable()
export class LLMService {
    private readonly logger = new Logger(LLMService.name);

    constructor(
        @Inject(llmConfig.KEY)
        private readonly llm: ConfigType<typeof llmConfig>
    ) {}

    /**
     * Generates an answer using the LLM with provided context
     * @param question User's question
     * @param context Relevant document chunks for context
     * @returns LLM response with answer
     */
    async generateAnswer(question: string, context: string[]): Promise<LLMResponse> {
        try {
            if (this.llm.provider === 'ollama') {
                return await this.generateAnswerOllama(question, context);
            } else if (this.llm.provider === 'chutes-ai') {
                return await this.generateAnswerChutes(question, context);
            } else if (this.llm.provider === 'openrouter') {
                return await this.generateAnswerOpenRouter(question, context);
            } else {
                throw new Error(`Unsupported LLM provider: ${this.llm.provider}`);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to generate answer: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Generates answer using Ollama
     */
    private async generateAnswerOllama(question: string, context: string[]): Promise<LLMResponse> {
        const model = this.llm.model || 'llama3.2';
        const baseUrl = this.llm.baseUrl || 'http://localhost:11434';
        const temperature = this.llm.temperature || 0.3; // Lower temperature for faster, more focused responses
        const maxTokens = Math.min(this.llm.maxTokens || 512, 512); // Limit tokens for faster generation

        // Build context from retrieved chunks (optimized, shorter format)
        const contextText = context
            .map((chunk, index) => `[${index + 1}] ${chunk}`)
            .join('\n\n');

        // Create shorter, more efficient prompt for RAG
        const prompt = `Answer based on context only. If context doesn't have the answer, say so.

Context:
${contextText}

Q: ${question}
A:`;

        // Add timeout (15 seconds max for LLM)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        try {
            const response = await fetch(`${baseUrl}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model,
                    prompt,
                    stream: false,
                    options: {
                        temperature,
                        num_predict: maxTokens, // Limit generation length
                    },
                }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();

            return {
                answer: data.response || '',
                model: data.model || model,
                usage: data.eval_count ? {
                    promptTokens: data.prompt_eval_count,
                    completionTokens: data.eval_count,
                    totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
                } : undefined,
            };
        } catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error('LLM generation timeout (15s exceeded)');
            }
            throw error;
        }
    }

    /**
     * Generates answer using Chutes.ai
     */
    private async generateAnswerChutes(question: string, context: string[]): Promise<LLMResponse> {
        const apiKey = this.llm.apiKey;
        const apiUrl = this.llm.chutesApiUrl || 'https://api.chutes.ai';
        const model = this.llm.model;
        const temperature = this.llm.temperature || 0.3;
        const maxTokens = Math.min(this.llm.maxTokens || 512, 512);

        if (!apiKey) {
            throw new Error('Chutes.ai API key is required. Set CHUTES_AI_API_KEY environment variable.');
        }

        // Build context from retrieved chunks
        const contextText = context
            .map((chunk, index) => `[${index + 1}] ${chunk}`)
            .join('\n\n');

        // Create prompt for RAG
        const prompt = `Answer based on context only. If context doesn't have the answer, say so.

Context:
${contextText}

Q: ${question}
A:`;

        // Add timeout (15 seconds max for LLM)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        try {
            // Chutes.ai typically uses OpenAI-compatible API format
            // Chutes.ai supports both Authorization Bearer and X-API-Key
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            
            // Prefer Authorization Bearer, fallback to X-API-Key
            if (apiKey.startsWith('Bearer ') || apiKey.startsWith('bearer ')) {
                headers['Authorization'] = apiKey;
            } else if (apiKey.startsWith('sk-') || apiKey.length > 20) {
                // Looks like a standard API key
                headers['Authorization'] = `Bearer ${apiKey}`;
            } else {
                // Use X-API-Key header
                headers['X-API-Key'] = apiKey;
            }

            const response = await fetch(`${apiUrl}/v1/chat/completions`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    model,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a helpful assistant that answers questions based on the provided context from PDF documents. Use only the information from the context to answer the question. If the context doesn\'t contain enough information to answer the question, say so.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature,
                    max_tokens: maxTokens,
                    stream: false,
                }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Chutes.ai API error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();

            // Handle OpenAI-compatible response format
            const answer = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || '';
            const usage = data.usage;

            return {
                answer,
                model: data.model || model,
                usage: usage ? {
                    promptTokens: usage.prompt_tokens,
                    completionTokens: usage.completion_tokens,
                    totalTokens: usage.total_tokens,
                } : undefined,
            };
        } catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error('LLM generation timeout (15s exceeded)');
            }
            throw error;
        }
    }

    /**
     * Generates answer using OpenRouter
     */
    private async generateAnswerOpenRouter(question: string, context: string[]): Promise<LLMResponse> {
        const apiKey = this.llm.openrouterApiKey;
        const apiUrl = this.llm.openrouterApiUrl || 'https://openrouter.ai/api/v1';
        const model = this.llm.model;
        const temperature = this.llm.temperature || 0.3;
        const maxTokens = Math.min(this.llm.maxTokens || 512, 512);

        if (!apiKey) {
            throw new Error('OpenRouter API key is required. Set OPENROUTER_API_KEY environment variable.');
        }

        // Build context from retrieved chunks
        const contextText = context
            .map((chunk, index) => `[${index + 1}] ${chunk}`)
            .join('\n\n');

        // Create prompt for RAG
        const prompt = `Answer based on context only. If context doesn't have the answer, say so.

Context:
${contextText}

Q: ${question}
A:`;

        // Add timeout (15 seconds max for LLM)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        try {
            const response = await fetch(`${apiUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || '', // Optional: for analytics
                    'X-Title': process.env.OPENROUTER_APP_NAME || 'DocSense', // Optional: app name
                },
                body: JSON.stringify({
                    model,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a helpful assistant that answers questions based on the provided context from PDF documents. Use only the information from the context to answer the question. If the context doesn\'t contain enough information to answer the question, say so.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature,
                    max_tokens: maxTokens,
                    stream: false,
                }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();

            // Handle OpenAI-compatible response format
            const answer = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || '';
            const usage = data.usage;

            return {
                answer,
                model: data.model || model,
                usage: usage ? {
                    promptTokens: usage.prompt_tokens,
                    completionTokens: usage.completion_tokens,
                    totalTokens: usage.total_tokens,
                } : undefined,
            };
        } catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error('LLM generation timeout (15s exceeded)');
            }
            throw error;
        }
    }
}
