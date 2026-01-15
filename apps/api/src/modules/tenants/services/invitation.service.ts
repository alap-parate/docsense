import { Injectable, NotFoundException, Inject, ConflictException, GoneException, ForbiddenException } from '@nestjs/common';
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
        const user = await this.userRepo.findByEmail(email);
        if(!user) {
            throw new NotFoundException('User not found');
        }

        const invite = await this.invRepo.findInvite(user.id, tenantId);
        if(invite?.expiresAt && invite.expiresAt  < new Date()) {
            throw new ConflictException('User already has a pending invitation')
        }

        const token = `${tenantId}:${user.id}`;
        const tokenHash = generateHash(token, this.inviteTokenSecert);
        const expiry = new Date(Date.now() + ms(this.inviteTokenExpiry));
        const response = await this.invRepo.inviteUser(inviterId, user.id, tenantId, email, role, tokenHash, expiry);

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

        if(invite?.expiresAt && invite.expiresAt > new Date()) {
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
