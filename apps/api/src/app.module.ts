import { Module } from '@nestjs/common';
import { ConfigModule } from './core/config/config.module';
import { AuthModule } from './core/auth/auth.module';
import { DatabaseModule } from './core/database/database.module';
import { UsersModule } from './modules/users/users.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { HealthModule } from './core/health/health.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { StorageModule } from './modules/storage/storage.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { AuditModule } from './modules/audit/audit.module';
import { ProcessingModule } from './modules/processing/processing.module';
import { DemoModule } from './modules/demo/demo.module';
import { BullMqModule } from './core/bullmq/redis.module';
import { ElasticModule } from './core/elastic/elastic.module';
import { SearchModule } from './modules/search/search.module';
import { RAGModule } from './modules/rag/rag.module';

@Module({
  imports: [
    ConfigModule, 
    BullMqModule,
    DatabaseModule, 
    AuthModule, 
    UsersModule, 
    TenantsModule, 
    HealthModule, 
    NotificationsModule, 
    StorageModule, 
    DocumentsModule, 
    AuditModule, 
    ProcessingModule, 
    DemoModule, 
    ElasticModule, 
    SearchModule,
    RAGModule,
  ],
  providers: [],
})
export class AppModule {}
