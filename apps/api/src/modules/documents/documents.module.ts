import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentPages } from './entities/document-pages.entity';
import { DocumentsService } from './services/documents.service';
import { DocumentPagesRepository } from './repositories/document-pages.repository';

@Module({
    imports: [
        TypeOrmModule.forFeature([DocumentPages])
    ],
    providers: [DocumentsService, DocumentPagesRepository],
    exports: [DocumentsService, DocumentPagesRepository]
})
export class DocumentsModule {}
