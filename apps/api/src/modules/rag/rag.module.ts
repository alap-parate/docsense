import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ElasticModule } from 'src/core/elastic/elastic.module';
import { StorageModule } from 'src/modules/storage/storage.module';
import { Files } from 'src/modules/storage/entities/files.entity';
import { EmbeddingService } from './services/embedding.service';
import { LLMService } from './services/llm.service';
import { ChunkingService } from './services/chunking.service';
import { RAGService } from './services/rag.service';
import { RAGController } from './rag.controller';
import { AuthModule } from 'src/core/auth/auth.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Files]),
        ConfigModule,
        ElasticModule,
        StorageModule,
        AuthModule,
    ],
    providers: [
        EmbeddingService,
        LLMService,
        ChunkingService,
        RAGService,
    ],
    controllers: [
        RAGController,
    ],
    exports: [
        EmbeddingService,
        ChunkingService,
    ]
})
export class RAGModule {}
