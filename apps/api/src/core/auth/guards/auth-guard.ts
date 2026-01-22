import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtVerifierService } from '../services/jwt-verifier.service';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(
        private readonly jwtVerifier: JwtVerifierService,
        private readonly authService: AuthService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers['authorization'];

        if (!authHeader?.startsWith('Bearer ')) {
            throw new UnauthorizedException('Missing Authorization Header');
        }

        const token = authHeader.replace('Bearer ', '');
        const payload = await this.jwtVerifier.verify(token) as { sub?: string };
        if (!payload.sub) {
            throw new UnauthorizedException('Invalid token: missing sub');
        }

        const user = await this.authService.findUserByExternalId(payload.sub);
        if (!user) {
            throw new UnauthorizedException(
                'User not synced. Call POST /api/v1/auth/sync after login (e.g. from Supabase auth webhook).',
            );
        }

        request.auth = payload;
        request.user = user;
        return true;
    }
}