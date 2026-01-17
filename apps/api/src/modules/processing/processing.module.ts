import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullMqModule } from 'src/core/bullmq/redis.module';
import { ElasticModule } from 'src/core/elastic/elastic.module';
import { DocumentsModule } from 'src/modules/documents/documents.module';
import { StorageModule } from 'src/modules/storage/storage.module';
import { AuthModule } from 'src/core/auth/auth.module';
import { RAGModule } from 'src/modules/rag/rag.module';
import { PdfExtractorService } from './services/pdf-extractor.service';
import { EsIndexerService } from './services/es-indexer.service';
import { ProcessingJobsService } from './services/processing-jobs.service';
import { ProcessingJobsRepository } from './repositories/processing-jobs.repository';
import { ProcessingJobs } from './entities/processing-job.entity';
import { pdfProcessor } from './workers/pdf.processor';
import { ProcessingController } from './processing.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([ProcessingJobs]),
        BullMqModule,
        BullModule.registerQueue({
            name: 'pdf-processing'
        }),
        ElasticModule,
        DocumentsModule,
        StorageModule,
        AuthModule,
        RAGModule,
    ],
    providers: [
        PdfExtractorService,
        EsIndexerService,
        ProcessingJobsService,
        ProcessingJobsRepository,
        pdfProcessor,
    ],
    controllers: [
        ProcessingController,
    ],
    exports: [
        ProcessingJobsService,
    ]
})
export class ProcessingModule {}
