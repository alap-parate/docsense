import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ElasticModule } from 'src/core/elastic/elastic.module';
import { StorageModule } from 'src/modules/storage/storage.module';
import { Files } from 'src/modules/storage/entities/files.entity';
import { SearchService } from './services/search.service';
import { SearchController } from './search.controller';
import { AuthModule } from 'src/core/auth/auth.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Files]),
        ElasticModule,
        StorageModule,
        AuthModule,
    ],
    providers: [
        SearchService,
    ],
    controllers: [
        SearchController,
    ],
    exports: [
        SearchService,
    ]
})
export class SearchModule {}