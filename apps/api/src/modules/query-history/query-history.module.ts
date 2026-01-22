import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueryHistory } from './entities/query-history.entity';
import { QueryHistoryRepository } from './repositories/query-history.repository';
import { QueryHistoryService } from './services/query-history.service';
import { QueryHistoryWorker } from './workers/query-history.worker';
import { QueryHistoryController } from './query-history.controller';
import { BullMqModule } from 'src/core/bullmq/redis.module';
import { AuthModule } from 'src/core/auth/auth.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([QueryHistory]),
        BullMqModule,
        BullModule.registerQueue({ name: 'query-history-logging' }),
        AuthModule,
    ],
    providers: [QueryHistoryRepository, QueryHistoryService, QueryHistoryWorker],
    controllers: [QueryHistoryController],
    exports: [QueryHistoryService],
})
export class QueryHistoryModule {}
