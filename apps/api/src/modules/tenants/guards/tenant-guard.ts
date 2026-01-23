import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { TenantRepository } from '../repositories/tenant.repository';
import { MembershipStatus } from '../constants/membership-status.enum';
import type { AuthUser } from 'src/shared/types/auth-user.type';

@Injectable()
export class TenantGuard implements CanActivate {
    constructor(private readonly tenantRepo: TenantRepository) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user as AuthUser | undefined;

        if (!user?.id) {
            throw new ForbiddenException('User not authenticated');
        }

        // Extract tenantId from query, body, or params (priority order)
        const tenantId =
            request.query?.tenantId ??
            request.body?.tenantId ??
            request.params?.tenantId;

        // If no tenantId provided, allow (will use user's default tenantId)
        if (!tenantId) {
            return true;
        }

        // Check if user belongs to the tenant with ACTIVE status
        const status = await this.tenantRepo.findUserStatus(user.id, tenantId);
        if (!status || status !== MembershipStatus.ACTIVE) {
            throw new ForbiddenException(
                `User is not an active member of tenant ${tenantId}`,
            );
        }

        return true;
    }
}
