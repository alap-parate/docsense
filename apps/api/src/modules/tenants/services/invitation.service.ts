import { Injectable, NotFoundException, Inject, ConflictException, GoneException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InvitationRepository } from '../repositories/invitation.repository';
import { UserRepository } from 'src/modules/users/repositories/user.repository';
import { TenantRole } from '../constants/tenant-role.enum';
import { generateHash } from 'src/shared/utils/crypto';
import inviteConfig from 'src/core/config/configuration/inviteConfig';
import type { ConfigType } from '@nestjs/config';
import ms from 'ms';
import { DataSource } from 'typeorm';
import { TenantRepository } from '../repositories/tenant.repository';
import { MembershipStatus } from '../constants/membership-status.enum';
import { InvitationStatus } from '../constants/invitation-status.enum';

@Injectable()
export class InvitationService {

    private inviteTokenSecert;
    private inviteTokenExpiry;

    constructor(
        private readonly invRepo: InvitationRepository,
        private readonly userRepo: UserRepository,
        private readonly tenantUserRepo: TenantRepository, 
        @Inject(inviteConfig.KEY)
        private readonly invConfig: ConfigType<typeof inviteConfig>,
        private readonly dataSource: DataSource,
    ) {
        this.inviteTokenSecert = this.invConfig.inviteSecret;
        this.inviteTokenExpiry = this.invConfig.expiry
    }
    async invite(
        email: string,
        tenantId: string,
        role: TenantRole,
        inviterId: string,
    ) {
        // Check inviter's role and permissions
        const inviterMembership = await this.tenantUserRepo.findUser(inviterId, tenantId);
        if (!inviterMembership || inviterMembership.status !== MembershipStatus.ACTIVE) {
            throw new ForbiddenException('You are not an active member of this tenant');
        }

        const inviterRole = inviterMembership.role;

        // Role-based permission checks
        // if (inviterRole === TenantRole.OWNER) {
        //     throw new ForbiddenException('Owners cannot send invitations');
        // }

        if (inviterRole === TenantRole.MEMBER || inviterRole === TenantRole.VIEWER) {
            throw new ForbiddenException(`${inviterRole}s cannot send invitations`);
        }

        // EDITOR can only invite MEMBER and VIEWER, not EDITOR
        if (inviterRole === TenantRole.EDITOR) {
            if (role === TenantRole.EDITOR) {
                throw new ForbiddenException('Editors cannot invite other editors');
            }
            if (![TenantRole.MEMBER, TenantRole.VIEWER].includes(role)) {
                throw new BadRequestException(`Editors can only invite ${TenantRole.MEMBER} or ${TenantRole.VIEWER} roles`);
            }
        }

        // Validate target role (should not be OWNER)
        if (role === TenantRole.OWNER) {
            throw new BadRequestException('Cannot invite users as OWNER');
        }

        if (![TenantRole.EDITOR, TenantRole.MEMBER, TenantRole.VIEWER].includes(role)) {
            throw new BadRequestException('Invalid role');
        }

        const user = await this.userRepo.findByEmail(email);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Check if user is already an active member of the tenant
        const existingMembership = await this.tenantUserRepo.findUser(user.id, tenantId);
        if (existingMembership?.status === MembershipStatus.ACTIVE) {
            throw new ConflictException('User is already an active member of this tenant');
        }

        // Check if this email already has a pending (non-expired) invitation for this tenant
        // Use email+tenantId because the unique constraint is on (tenantId, email)
        const existingInvite = await this.invRepo.findInviteByEmailAndTenant(email, tenantId);
        if (existingInvite) {
            // If invite exists and hasn't expired, it's still pending
            if (!existingInvite.expiresAt || existingInvite.expiresAt >= new Date()) {
                throw new ConflictException('This email already has a pending invitation for this tenant');
            }
        }

        const token = `${tenantId}:${user.id}`;
        const tokenHash = generateHash(token, this.inviteTokenSecert);
        const expiry = new Date(Date.now() + ms(this.inviteTokenExpiry));
        const response = await this.invRepo.inviteUser(
            inviterId,
            user.id,
            tenantId,
            email,
            role,
            tokenHash,
            expiry,
            new Date(),
        );

        // trigger a mail event here with original token

        // trigger notification event here with original token

        return response;
    }

    async acceptInvite(rawToken: string) {
        // hash the raw token 
        const tokenHash = generateHash(rawToken, this.inviteTokenSecert);

        // search in db for validity
        const invite = await this.invRepo.findInvitationByHash(tokenHash);

        if(!invite) {
            throw new NotFoundException('Invalid invite')
        }

        if(invite?.status && invite.status == InvitationStatus.REVOKED) {
            throw new GoneException('Invitation has been revoked')
        }
        console.log(invite?.expiresAt);
        console.log(new Date());
        if(invite?.expiresAt && invite.expiresAt < new Date()) {
            await this.invRepo.expireToken(tokenHash)
            throw new GoneException('Invitation is expired')
        }

        await this.dataSource.transaction(async (manager) => {
            await this.invRepo.acceptInvitation(invite.id, invite.userId, manager);
            await this.tenantUserRepo.assignUser(invite.tenantId, invite.userId, invite.role, MembershipStatus.ACTIVE)
        })

        return {
            userId: invite.userId,
            role: invite.role,
        }
    }

    async revokeInvitation(id: string, userId: string) {

        const invite = await this.invRepo.findInviteById(id);
        if(!invite) {
            throw new NotFoundException('Invite not found')
        }
        if(invite?.createdById != userId) {
            throw new ForbiddenException('You are not allowed to revoke this invitation')
        }
        return await this.invRepo.revokeInvitation(id, userId)
    }

}
