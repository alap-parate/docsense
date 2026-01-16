import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
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

@Module({
  imports: [
    ConfigModule, 
    AuthModule, 
    DatabaseModule, 
    UsersModule, 
    TenantsModule, 
    HealthModule, 
    NotificationsModule, 
    StorageModule, 
    DocumentsModule, 
    AuditModule, 
    ProcessingModule, DemoModule, 
  ],
  providers: [],
})
export class AppModule {}
