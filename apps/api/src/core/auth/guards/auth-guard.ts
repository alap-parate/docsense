import { 
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException
 } from "@nestjs/common";
 import { JwtVerifierService } from "../services/jwt-verifier.service";
import { Observable } from "rxjs";
import { AuthService } from "../services/auth.service";

 @Injectable()
 export class AuthGuard implements CanActivate {
    constructor( 
        private readonly jwtVerifier: JwtVerifierService,
        private readonly authService: AuthService
    ){}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers['authorization'];
        
        if(!authHeader?.startsWith('Bearer ')) {
            throw new UnauthorizedException('Missing Authorization Header');
        }

        let payload: any;
        const token = authHeader.replace('Bearer ', '');
        payload = await this.jwtVerifier.verify(token);

        const userId = payload.sub;
        const email = payload.email;
        const firstName = payload.user_metadata?.first_name;
        const lastName = payload.user_metadata?.last_name;
        const provider = payload.app_metadata.provider;

        const user = await this.authService.syncUserFromSupabase(userId, email, provider, firstName, lastName);

        request.auth = payload;
        request.user = user;

        return true;
    }
 }