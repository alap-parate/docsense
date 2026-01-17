import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentPages } from '../entities/document-pages.entity';
import { createHash } from 'crypto';

export interface PageToSave {
    pageNumber: number;
    text: string;
}

@Injectable()
export class DocumentsService {
    constructor(
        @InjectRepository(DocumentPages)
        private readonly documentPagesRepo: Repository<DocumentPages>,
    ) {}

    /**
     * Saves pages to PostgreSQL database
     * @param pages Array of pages with pageNumber and text
     * @param fileId UUID of the file
     * @param tenantId UUID of the tenant
     * @returns Promise<DocumentPages[]> Array of saved document pages
     */
    async savePages(
        pages: PageToSave[],
        fileId: string,
        tenantId: string,
    ): Promise<DocumentPages[]> {
        const documentPages = pages.map((page) => {
            const checksum = this.calculateChecksum(page.text);
            
            const documentPage = this.documentPagesRepo.create({
                fileId,
                tenantId,
                pageNumber: page.pageNumber,
                textContent: page.text,
                checksum,
            });

            return documentPage;
        });

        return await this.documentPagesRepo.save(documentPages);
    }

    /**
     * Calculates SHA-256 checksum for text content
     * @param text Text content to hash
     * @returns Hex string checksum
     */
    private calculateChecksum(text: string): string {
        return createHash('sha256').update(text).digest('hex');
    }
}
