import { Injectable, Logger } from '@nestjs/common';

export interface TextChunk {
    text: string;
    pageNumber: number;
    chunkIndex: number;
    startChar?: number;
    endChar?: number;
}

@Injectable()
export class ChunkingService {
    private readonly logger = new Logger(ChunkingService.name);

    /**
     * Splits text into semantic chunks based on structure
     * Tries to split on API sections, endpoints, request/response blocks
     * @param text Full text content
     * @param pageNumber Page number for metadata
     * @param chunkSize Maximum characters per chunk (default: 1000)
     * @param overlap Overlap between chunks in characters (default: 200)
     * @returns Array of text chunks
     */
    splitIntoChunks(
        text: string,
        pageNumber: number,
        chunkSize: number = 1000,
        overlap: number = 200
    ): TextChunk[] {
        if (!text || text.trim().length === 0) {
            return [];
        }

        const chunks: TextChunk[] = [];
        
        // First, try to split on semantic boundaries (API sections, endpoints, etc.)
        const semanticBoundaries = this.findSemanticBoundaries(text);
        
        if (semanticBoundaries.length > 0) {
            // Split on semantic boundaries
            let currentChunk = '';
            let currentStart = 0;
            let chunkIndex = 0;

            for (let i = 0; i < semanticBoundaries.length; i++) {
                const boundary = semanticBoundaries[i];
                const segment = text.substring(currentStart, boundary);

                if (currentChunk.length + segment.length > chunkSize && currentChunk.length > 0) {
                    // Save current chunk
                    chunks.push({
                        text: currentChunk.trim(),
                        pageNumber,
                        chunkIndex: chunkIndex++,
                        startChar: currentStart - currentChunk.length,
                        endChar: currentStart,
                    });

                    // Start new chunk with overlap
                    const overlapText = currentChunk.slice(-overlap);
                    currentChunk = overlapText + segment;
                    currentStart = boundary - overlap;
                } else {
                    currentChunk += segment;
                }
            }

            // Add remaining text
            if (currentChunk.trim().length > 0) {
                chunks.push({
                    text: currentChunk.trim(),
                    pageNumber,
                    chunkIndex: chunkIndex++,
                    startChar: currentStart,
                    endChar: text.length,
                });
            }
        } else {
            // Fallback to simple sliding window if no semantic boundaries found
            return this.slidingWindowChunk(text, pageNumber, chunkSize, overlap);
        }

        return chunks.filter(chunk => chunk.text.length > 0);
    }

    /**
     * Finds semantic boundaries in text (API endpoints, sections, etc.)
     */
    private findSemanticBoundaries(text: string): number[] {
        const boundaries: number[] = [];
        
        // Patterns for semantic boundaries
        const patterns = [
            /(?:^|\n)\s*(?:GET|POST|PUT|DELETE|PATCH)\s+\/[\w\/\-{}]+/gi, // REST endpoints
            /(?:^|\n)\s*##+\s+.+/g, // Markdown headers (##, ###)
            /(?:^|\n)\s*\d+\.\s+[A-Z][^\n]+/g, // Numbered sections
            /(?:^|\n)\s*[A-Z][A-Z\s]{3,}:/g, // Section headers (uppercase)
            /(?:^|\n)\s*\{[\s\S]{0,200}"\w+":/g, // JSON blocks
            /(?:^|\n)\s*```[\s\S]{0,500}```/g, // Code blocks
        ];

        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                if (!boundaries.includes(match.index)) {
                    boundaries.push(match.index);
                }
            }
        }

        return boundaries.sort((a, b) => a - b);
    }

    /**
     * Fallback: sliding window chunking
     */
    private slidingWindowChunk(
        text: string,
        pageNumber: number,
        chunkSize: number,
        overlap: number
    ): TextChunk[] {
        const chunks: TextChunk[] = [];
        let start = 0;
        let chunkIndex = 0;

        while (start < text.length) {
            let end = start + chunkSize;
            
            // Try to break at sentence boundary
            if (end < text.length) {
                const lastPeriod = text.lastIndexOf('.', end);
                const lastNewline = text.lastIndexOf('\n', end);
                const breakPoint = Math.max(lastPeriod, lastNewline);
                
                if (breakPoint > start + chunkSize * 0.5) {
                    end = breakPoint + 1;
                }
            }

            const chunkText = text.substring(start, end).trim();
            if (chunkText.length > 0) {
                chunks.push({
                    text: chunkText,
                    pageNumber,
                    chunkIndex: chunkIndex++,
                    startChar: start,
                    endChar: end,
                });
            }

            // Move start with overlap
            start = end - overlap;
            if (start <= 0) start = end;
        }

        return chunks;
    }
}
