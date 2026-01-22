import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, InsertResult, EntityManager } from "typeorm";
import { TenantInvitations } from "../entities/tenant-invitations.entity";
import { TenantRole } from "../constants/tenant-role.enum";
import { InvitationStatus } from "../constants/invitation-status.enum";

@Injectable()
export class InvitationRepository {
    constructor(
        @InjectRepository(TenantInvitations)
        private readonly tenantInvRepo: Repository<TenantInvitations>
    ) { }

    async inviteUser(
        inviterUserId: string,
        targetUserId: string,
        tenantId: string,
        email: string,
        role: TenantRole,
        tokenHash: string,
        expiresAt: Date,
        invitedAt: Date,
    ): Promise<TenantInvitations> {
        const result = await this.tenantInvRepo
            .createQueryBuilder()
            .insert()
            .into(TenantInvitations)
            .values({
                tenantId,
                email,
                userId: targetUserId,
                role,
                tokenHash,
                status: InvitationStatus.PENDING,
                expiresAt,
                invitedAt,
                createdById: inviterUserId,
            })
            .returning('*')
            .execute();

        return result.raw[0];

    };

    async acceptInvitation(
        Invid: string,
        userId: string,
        manager?: EntityManager
    ): Promise<InvitationRepository> {
        const repo = manager ? manager.getRepository(TenantInvitations) : this.tenantInvRepo;
        const result = await repo.update(
            { id: Invid }, {
            status: InvitationStatus.ACCEPTED,
            acceptedById: userId,
            updatedById: userId,
        },
        )
        return result.raw[0]
    }

    async findInvitationByHash(hash: string): Promise<TenantInvitations | null> {
        return this.tenantInvRepo.findOne({
            where: { tokenHash: hash },
            select: {
                id: true,
                tenantId: true,
                email: true,
                userId: true,
                role: true,
                tokenHash: true,
                status: true,
                expiresAt: true,
            }
        });
    };

    async revokeInvitation(id: string, userId: string): Promise<TenantInvitations> {
        const result = await this.tenantInvRepo.update(
            { id }, {
            status: InvitationStatus.REVOKED,
            updatedById: userId
        }
        );
        return result.raw[0];
    };

    async listInvitationByTenant(
        tenantId: string,
        page: number,
        limit: number
    ): Promise<TenantInvitations[] | null> {
        return this.tenantInvRepo.find({
            where: {
                tenantId: tenantId
            },
            select: {
                id: true,
                email: true,
                createdBy: {
                    id: true,
                    email: true,
                }
            },
            order: {
                invitedAt: "DESC"
            },
            skip: (page - 1 * limit),
            take: limit,
        })
    }

    async findInvite(
        userId: string,
        tenantId: string
    ): Promise<TenantInvitations | null> {
        const result = await this.tenantInvRepo.find({
            where: {
                userId: userId,
                tenantId: tenantId,
                status: InvitationStatus.PENDING
            },
            take: 1,
            order: {
                expiresAt: 'DESC'
            }
        })
        return result[0];
    }

    async findInviteById(
        id: string,
    ): Promise<TenantInvitations | null> {
        return await this.tenantInvRepo.findOne({
            where: { id },
        })
    }

    async expireToken(
        tokenHash: string
    ): Promise<TenantInvitations> {
        const result = await this.tenantInvRepo.update({
            tokenHash: tokenHash
        }, {
            status: InvitationStatus.EXPIRED
        })
        return result.raw[0]
    }
};