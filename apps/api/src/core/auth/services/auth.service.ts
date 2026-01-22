import { Injectable } from "@nestjs/common";
import { UserRepository } from "src/modules/users/repositories/user.repository";
import type { AuthUser } from "src/shared/types/auth-user.type";

@Injectable()
export class AuthService {
    constructor(private readonly userRepo: UserRepository) {}

    /**
     * Look up user by Supabase external user id. No DB write.
     * Use this in AuthGuard on every request.
     */
    async findUserByExternalId(externalUserId: string): Promise<AuthUser | null> {
        const user = await this.userRepo.findByExternalId(externalUserId);
        if (!user) return null;
        return { id: user.id, email: user.email };
    }

    /**
     * Upsert user from Supabase auth. Call only from POST /auth/sync
     * (e.g. Supabase login webhook or client immediately after login).
     */
    async syncUserFromSupabase(
        id: string,
        email: string,
        provider: string,
        firstName?: string,
        lastName?: string,
    ): Promise<{ id: string; email: string }> {
        const row = (await this.userRepo.syncUser({
            externalUserId: id,
            email,
            provider,
            fname: firstName,
            lname: lastName,
        })) as unknown as Record<string, unknown>;
        const uid = row.id ?? row['id'];
        const em = row.email ?? row['email'];
        if (uid == null || em == null) throw new Error('syncUser returned missing id or email');
        return { id: String(uid), email: String(em) };
    }
}