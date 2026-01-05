import { Module } from '@nestjs/common';
import { ConfigModule } from './core/config/config.module';
import { AuthModule } from './core/auth/auth.module';
import { ContextModule } from './core/context/context.module';
import { DatabaseModule } from './core/database/database.module';
import { TenantModule } from './core/tenant/tenant.module';
import { ExceptionsModule } from './core/exceptions/exceptions.module';
import { UsersModule } from './modules/users/users.module';
import { FilesModule } from './modules/files/files.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { FoldersModule } from './modules/folders/folders.module';
import { HealthModule } from './core/health/health.module';
import { DemoModule } from './modules/demo/demo.module';

@Module({
  imports: [
    ConfigModule, 
    AuthModule, 
    ContextModule, 
    DatabaseModule, 
    TenantModule, 
    ExceptionsModule, 
    UsersModule, 
    FilesModule, 
    TenantsModule, 
    FoldersModule, 
    HealthModule, 
    DemoModule
  ],
})
export class AppModule {}
