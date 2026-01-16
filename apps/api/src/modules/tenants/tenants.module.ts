import { Module } from '@nestjs/common';
import { TenantService } from './services/tenants.service';
import { InvitationService } from './services/invitation.service';
import { TenantRepository } from './repositories/tenant.repository';
import { InvitationRepository } from './repositories/invitation.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenants } from './entities/tenants.entity';
import { TenantUsers } from './entities/tenant-users.entity';
import { TenantInvitations } from './entities/tenant-invitations.entity';
import { Folders } from '../storage/entities/folder.entity';
import { TenantsController } from './tenants.controller';
import { AuthModule } from 'src/core/auth/auth.module';
import { UsersModule } from 'src/modules/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tenants,
      TenantUsers,
      TenantInvitations,
      Folders,
    ]),
    AuthModule,
    UsersModule
  ],
  providers: [
    TenantService, 
    InvitationService,
    TenantRepository,
    InvitationRepository,
  ],
  exports: [
    TenantRepository
  ],
  controllers: [TenantsController]
})
export class TenantsModule {}
