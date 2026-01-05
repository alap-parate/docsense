import { 
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException
 } from "@nestjs/common";
 import { JwtVerifierService } from "../services/jwt-verifier.service";
import { Observable } from "rxjs";

 @Injectable()
 export class AuthGuard implements CanActivate {
    constructor( 
        private readonly jwtVerifier: JwtVerifierService
    ){}

    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers['authorization'];
        
        if(!authHeader?.startsWith('Bearer ')) {
            throw new UnauthorizedException('Missing Authorization Header');
        }

        const token = authHeader.replace('Bearer ', '');
        const payload = this.jwtVerifier.verify(token);

        request.user = payload;
        return true;
    }
 }