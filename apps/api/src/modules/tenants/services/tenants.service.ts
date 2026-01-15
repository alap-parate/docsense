import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { TenantRepository } from '../repositories/tenant.repository';
import { DataSource } from 'typeorm';
import { TenantRole } from '../constants/tenant-role.enum';
import { MembershipStatus } from '../constants/membership-status.enum';

@Injectable()
export class TenantService {

    constructor(
        private readonly tenantRepo: TenantRepository,
        private readonly dataSource: DataSource
    ) {}

    async createTenant(input: {tenantName: string, createdByUserId: string}) {
        const { tenantName, createdByUserId } = input;
        let tenant;
        await this.dataSource.transaction(async (manager) => {
            tenant = await this.tenantRepo.createTenant(createdByUserId, tenantName, manager);
            await this.tenantRepo.assignUser(
                    tenant.id,
                    createdByUserId,
                    TenantRole.OWNER,
                    MembershipStatus.ACTIVE,
                )
        })
        return tenant;
    }

    async listTenants(
        userId: string, 
        page: number,
        limit: number, 
        offset: number
    ) {
        const [tenant, total] = await this.tenantRepo.findTenantByUserId(userId, limit, offset);

        return {
            workspace: tenant.map(t => ({
                id: t.tenant.id,
                name: t.tenant.name,
            })),
            pagination: {
                page,
                limit, 
                total
            },
        };
    }

    async listUsers(
        tenantId: string,
        page: number,
        limit: number,
        offset: number
    ) {
        const [users, total] = await this.tenantRepo.findUsersByTenantId(tenantId, limit, offset);
        return {
            users: users.map(u => ({
                userId: u.userId,
                name: u.user?.fname ?? "" + " " + u.user?.lname,
                joinedDate: u.joinedAt,
                role: u.role,
            })),
            pagination: {
                page, 
                limit,
                total
            }
        }
    }

    async renameTenant(tenantId: string, userId: string, name: string) {
        // check if user is the owner of the tenant
        const role = await this.tenantRepo.findUser(userId, tenantId);
        if(role?.role != TenantRole.OWNER) {
            throw new ForbiddenException('Only owner can rename the workspace')
        }

        const tenant = await this.tenantRepo.renameTenant(tenantId, name)
        return {
            id: tenant.id,
            name: tenant.name
        };
    }

    async removeUser(tenantId: string, actorId: string, targetUserId: string) {
        const actor = await this.tenantRepo.findUser(actorId, tenantId);
        
        if(!actor?.role) {
            throw new ForbiddenException('Not a workspace member');
        }        

        const target = await this.tenantRepo.findUser(targetUserId, tenantId);
        if(!target) {
            throw new NotFoundException('User not found in workspace');
        }

        if(actorId === targetUserId) {
            throw new BadRequestException('Cannot remove yourself');
        }

        if(target.role === TenantRole.OWNER) {
            throw new BadRequestException('Cannot remove tenant owner')
        }

        if(
            actor.role === TenantRole.EDITOR && ![TenantRole.MEMBER,TenantRole.VIEWER].includes(target.role)
        ) {
            throw new ForbiddenException('Insufficient permissions')
        }

        if(
            actor.role !== TenantRole.OWNER &&
            actorId !== TenantRole.EDITOR
        ) {
            throw new ForbiddenException('Insufficient permissions')
        }

        await this.tenantRepo.removeUser(actorId, targetUserId, tenantId)

        return {
            userId: targetUserId,
            role: target.role
        }
    }

    async changeUsersRole(
        tenantId: string,
        actorId: string,
        targetUserId: string,
        newRole: TenantRole
    ) {
        const actor = await this.tenantRepo.findUser(actorId, tenantId);
        if(!actor?.role) {
            throw new ForbiddenException('Not a tenant member')
        }

        const membership = await this.tenantRepo.findUser(targetUserId, tenantId);
        if(!membership || membership.status !== MembershipStatus.ACTIVE) {
            throw new BadRequestException('User is not an active member')
        }

        if(membership.role === TenantRole.OWNER) {
            throw new BadRequestException('Cannot change owner role')
        }

        if(actorId === targetUserId) {
            throw new BadRequestException('Cannot change your own role')
        }

        // role hierarchy check
        if (actor?.role === TenantRole.EDITOR && ![TenantRole.MEMBER, TenantRole.VIEWER].includes(membership.role)) {
            throw new ForbiddenException('Insufficient permissions');
        }

        if (actor?.role !== TenantRole.OWNER && actor?.role !== TenantRole.EDITOR) {
          throw new ForbiddenException('Insufficient permissions');
        }
    
        if (newRole === TenantRole.OWNER) {
          throw new BadRequestException('Cannot assign OWNER role');
        }

        await this.tenantRepo.changeUserRole(tenantId, targetUserId, newRole, actorId)

        return {
            userId: targetUserId,
            role: newRole
        }        
    }



}
