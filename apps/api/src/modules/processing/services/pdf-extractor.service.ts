import { PDFParse } from 'pdf-parse';
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { S3Service } from 'src/modules/storage/services/s3.service';
import * as fs from 'fs';

export interface ExtractedPage {
    pageNumber: number;
    text: string;
}

@Injectable()
export class PdfExtractorService {
    private readonly logger = new Logger(PdfExtractorService.name);

    constructor(
        private readonly s3: S3Service,
    ) {}

    async extractFromS3(s3Key: string, fileId: string): Promise<ExtractedPage[]> {
        let tempFilePath: string | null = null;
        
        try {
            // Stream the file from S3 to a temporary file in chunks
            // This avoids loading the entire file (e.g., 1GB) into memory at once
            this.logger.log(`Streaming PDF from S3 to temporary file: ${s3Key}`);
            tempFilePath = await this.s3.streamToTempFile(s3Key);
            
            // Check if temp file exists and has content
            if (!fs.existsSync(tempFilePath)) {
                throw new BadRequestException(
                    `Temporary file was not created for PDF: ${s3Key}`
                );
            }
            
            const stats = fs.statSync(tempFilePath);
            if (stats.size === 0) {
                throw new BadRequestException(
                    `PDF file is empty (0 bytes) in S3: ${s3Key}. ` +
                    `Please ensure the file was uploaded correctly before processing.`
                );
            }

            this.logger.log(`Reading PDF from temporary file (${(stats.size / 1024 / 1024).toFixed(2)} MB): ${tempFilePath}`);
            
            // Read the file from disk (this still loads into memory, but avoids having
            // two copies - one from download and one for parsing)
            // For very large files, pdf-parse will still need the full buffer in memory
            const buffer = fs.readFileSync(tempFilePath);
            
            const parser = new PDFParse({data: buffer});
            
            // Get the total number of pages using getInfo
            const info = await parser.getInfo({ parsePageInfo: true });
            const numPages = info.total;
            
            this.logger.log(`Extracting text from ${numPages} pages`);
            
            // Extract text from each page individually
            const pages: ExtractedPage[] = [];
            for (let pageNum = 1; pageNum <= numPages; pageNum++) {
                const pageResult = await parser.getText({ partial: [pageNum] });
                if (pageResult.text && pageResult.text.trim()) {
                    pages.push({
                        pageNumber: pageNum,
                        text: pageResult.text
                    });
                }
            }

            await parser.destroy();

            // Clean up temporary file
            if (tempFilePath && fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
                this.logger.debug(`Cleaned up temporary file: ${tempFilePath}`);
            }

            return pages;
        } catch (error) {
            // Ensure temp file is cleaned up on error
            if (tempFilePath && fs.existsSync(tempFilePath)) {
                try {
                    fs.unlinkSync(tempFilePath);
                    this.logger.debug(`Cleaned up temporary file after error: ${tempFilePath}`);
                } catch (cleanupError) {
                    this.logger.warn(`Failed to cleanup temp file ${tempFilePath}: ${cleanupError}`);
                }
            }
            
            // Re-throw the original error
            if (error instanceof BadRequestException) {
                throw error;
            }
            
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new BadRequestException(
                `Failed to extract PDF from S3: ${errorMessage}`
            );
        }
    }
}