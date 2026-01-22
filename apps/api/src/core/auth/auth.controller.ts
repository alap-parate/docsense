import {
    Controller,
    Post,
    Headers,
    HttpCode,
    HttpStatus,
    UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { JwtVerifierService } from './services/jwt-verifier.service';

/**
 * Call this after Supabase login (e.g. from your Supabase Auth webhook or from the
 * client immediately after sign-in). Syncs the user into our DB. All other
 * protected routes only look up the user; they do not sync.
 */
@Controller({ version: '1', path: 'auth' })
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly jwtVerifier: JwtVerifierService,
    ) {}

    @Post('sync')
    @HttpCode(HttpStatus.OK)
    async sync(
        @Headers('authorization') authorization: string | undefined,
    ): Promise<{ id: string; email: string }> {
        if (!authorization?.startsWith('Bearer ')) {
            throw new UnauthorizedException('Missing Authorization: Bearer <token>');
        }
        const token = authorization.replace('Bearer ', '');
        const payload = await this.jwtVerifier.verify(token) as { sub?: string; email?: string; app_metadata?: { provider?: string }; user_metadata?: { first_name?: string; last_name?: string } };
        if (!payload.sub) throw new UnauthorizedException('Invalid token: missing sub');

        const provider = payload.app_metadata?.provider ?? 'email';
        const firstName = payload.user_metadata?.first_name;
        const lastName = payload.user_metadata?.last_name;

        return this.authService.syncUserFromSupabase(
            payload.sub,
            payload.email ?? '',
            provider,
            firstName,
            lastName,
        );
    }
}
