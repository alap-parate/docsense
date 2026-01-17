import { registerAs } from '@nestjs/config';

export interface LLMConfig {
    provider: 'ollama' | 'llm-studio' | 'chutes-ai' | 'openrouter';
    embeddingProvider?: 'ollama' | 'chutes-ai' | 'openrouter'; // Optional: separate provider for embeddings
    baseUrl: string;
    model: string;
    embeddingModel?: string;
    temperature?: number;
    maxTokens?: number;
    // Chutes.ai specific
    apiKey?: string;
    chutesApiUrl?: string;
    embeddingApiKey?: string; // Optional: separate API key for embeddings
    // OpenRouter specific
    openrouterApiKey?: string;
    openrouterApiUrl?: string;
    openrouterEmbeddingApiKey?: string; // Optional: separate API key for embeddings
}

export default registerAs('llm', (): LLMConfig => {
    const provider = (process.env.LLM_PROVIDER as 'ollama' | 'llm-studio' | 'chutes-ai' | 'openrouter') || 'ollama';
    const embeddingProvider = (process.env.LLM_EMBEDDING_PROVIDER as 'ollama' | 'chutes-ai' | 'openrouter') || provider;
    
    // Determine default embedding model based on provider
    let defaultEmbeddingModel = 'nomic-embed-text';
    if (embeddingProvider === 'chutes-ai') {
        defaultEmbeddingModel = 'text-embedding-ada-002';
    } else if (embeddingProvider === 'openrouter') {
        defaultEmbeddingModel = 'openai/text-embedding-3-small';
    }
    
    return {
        provider,
        embeddingProvider,
        baseUrl: process.env.LLM_BASE_URL || 'http://localhost:11434',
        model: process.env.LLM_MODEL || 'llama3.2',
        embeddingModel: process.env.LLM_EMBEDDING_MODEL || defaultEmbeddingModel,
        temperature: Number(process.env.LLM_TEMPERATURE) || 0.7,
        maxTokens: Number(process.env.LLM_MAX_TOKENS) || 2048,
        // Chutes.ai configuration
        apiKey: process.env.CHUTES_AI_API_KEY,
        chutesApiUrl: process.env.CHUTES_AI_API_URL || 'https://api.chutes.ai',
        embeddingApiKey: process.env.CHUTES_AI_EMBEDDING_API_KEY || process.env.CHUTES_AI_API_KEY,
        // OpenRouter configuration
        openrouterApiKey: process.env.OPENROUTER_API_KEY,
        openrouterApiUrl: process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1',
        openrouterEmbeddingApiKey: process.env.OPENROUTER_EMBEDDING_API_KEY || process.env.OPENROUTER_API_KEY,
    };
});
