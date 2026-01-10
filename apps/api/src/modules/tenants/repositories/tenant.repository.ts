import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Tenants } from "../entities/tenants.entity";
import { EntityManager, Repository } from "typeorm";
import { TenantUsers } from "../entities/tenant-users.entity";
import { TenantRole } from "../constants/tenant-role.enum";
import { MembershipStatus } from "../constants/membership-status.enum";
import { off } from "process";

@Injectable()
export class TenantRepository {
    constructor(
        @InjectRepository(Tenants)
        private readonly tenantRepo: Repository<Tenants>,

        @InjectRepository(TenantUsers)
        private readonly tenantUsersRepo: Repository<TenantUsers>,

    ) {}

    async createTenant(userId: string, name: string, manager?: EntityManager): Promise<Tenants> {
        const repo = manager? manager.getRepository(Tenants): this.tenantRepo;
        const result = await repo
            .createQueryBuilder()
            .insert()
            .into(Tenants)
            .values({
                name,
                createdById: userId
            })
            .returning('*')
            .execute();
        return result.raw[0]
    };

    async assignUser(
        tenantId: string,
        userId: string, 
        role: TenantRole,
        status: MembershipStatus,
        manager?: EntityManager
    ) {
        const repo = manager? manager.getRepository(TenantUsers): this.tenantUsersRepo
        repo.insert({
            tenantId: tenantId,
            userId: userId,
            role: role,
            status: status,
            joinedAt: () => 'CURRENT_TIMESTAMP',
            createdById: userId,
        })
    };

    async renameTenant(tenantId: string, name: string): Promise<Tenants> {
        const result = await this.tenantRepo
        .createQueryBuilder()
        .update(Tenants)
        .set({ name })
        .where('id=:tenantId', {tenantId})
        .returning(['id', 'name'])
        .execute()

        return result.raw[0];
    }

    async findTenantByUserId(id: string, limit=10, offset=0): Promise<[TenantUsers[], number]> {
        return this.tenantUsersRepo.findAndCount({
            where: {
                userId: id
            },
            take: limit,
            skip: offset,
            order: { 
                createdAt: 'DESC'
            },
            relations: ['tenant']
        })
    };

    async findUsersByTenantId(id: string, limit=10, offset=0): Promise<[TenantUsers[], number]> {
        return this.tenantUsersRepo.findAndCount({
            where: {
                tenantId: id
            },
            take: limit,
            skip: offset,
            order: {
                joinedAt: 'DESC'
            },
            relations: ['user']
        })
    };

    async findUser(userId: string, tenantId: string): Promise<TenantUsers | null> {
        const result = await this.tenantUsersRepo.findOne({
            where: {
                userId: userId,
                tenantId: tenantId
            }, 
            select: {
                id: true,
                status: true,
                role: true
            }
        })
        return result;
    }

    async findUserStatus(userId: string, tenantId: string): Promise<MembershipStatus | undefined> {
        const result = await this.tenantUsersRepo.findOne({
            where: {
                userId: userId,
                tenantId: tenantId
            }, 
            select: {
                status: true
            }
        })
        return result?.status
    }

    async removeUser(actorId: string, targetUser: string, tenantId: string): Promise<boolean> {
        const result = this.tenantUsersRepo.update(
            { 
                userId: targetUser,
                tenantId: tenantId
            }, {
                status: MembershipStatus.REMOVED,
                deletedAt: () => 'CURRENT_TIMESTAMP',
                deletedById: actorId
            }
        );
        return (await result).affected === 1;
    };

    async changeUserRole(tenantId: string, targetUserId: string, newRole: TenantRole, actorId: string): Promise<boolean> {
        const result = await this.tenantUsersRepo.update(
            { 
                tenantId: tenantId,
                userId: targetUserId,
                status: MembershipStatus.ACTIVE
            }, {
                role: newRole,
                updatedById: actorId,
            }
        );
        return result.affected === 1;
    };
}