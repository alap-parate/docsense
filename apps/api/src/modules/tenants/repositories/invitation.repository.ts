import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, InsertResult } from "typeorm";
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
        userId: string,
        tenantId: string,
        email: string,
        role: TenantRole,
        tokenHash: string,
        expiresAt: Date,
    ): Promise<InsertResult | null> {
        return this.tenantInvRepo.upsert({
            tenantId: tenantId,
            email: email,
            role: role,
            tokenHash: tokenHash,
            status: InvitationStatus.PENDING,
            expiresAt: expiresAt,
            invitedAt: () => 'CURRENT_TIMESTAMP',
            createdById: userId,
        }, ['email', 'tenantId']);
    };

    async acceptInvitation(
        Invid: string,
        userId: string
    ): Promise<boolean> {
        const result = await this.tenantInvRepo.update(
            { id: Invid }, {
                status: InvitationStatus.ACCEPTED,
                acceptedById: userId,
                updatedById: userId,
            }
        )
        return result.affected === 1 
    }

    async findInvitationByHash(hash: string): Promise<TenantInvitations | null> {
        return this.tenantInvRepo.findOne({
            where: { tokenHash: hash },
            select: {
                id: true,
                tenantId: true,
                email: true,
                role: true,
                tokenHash: true,
                status: true,
                expiresAt: true,
            }
        });
    };

    async revokeInvitation(id: string): Promise<boolean> {
        const result = await this.tenantInvRepo.update(
            { id }, {
                status: InvitationStatus.REVOKED,
            }
        );
        return result.affected === 1;
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
                createdBy: {
                    id: true,
                    email: true,
                }
            },
            order: {
                invitedAt:"DESC"
            },
            skip: (page - 1 * limit),
            take: limit,
        })
    }
};