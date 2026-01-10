import { Module } from '@nestjs/common';
import { TenantService } from './services/tenants.service';
import { InvitationService } from './services/invitation.service';
import { TenantRepository } from './repositories/tenant.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenants } from './entities/tenants.entity';
import { TenantUsers } from './entities/tenant-users.entity';
import { TenantsController } from './tenants.controller';
import { AuthModule } from 'src/core/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tenants,
      TenantUsers
    ]),
    AuthModule
  ],
  providers: [
    TenantService, 
    InvitationService,
    TenantRepository,
  ],
  exports: [
    TenantRepository
  ],
  controllers: [TenantsController]
})
export class TenantsModule {}
