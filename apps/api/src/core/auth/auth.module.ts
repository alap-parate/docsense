import { Module } from '@nestjs/common';
import { JwtVerifierService } from './services/jwt-verifier.service';
import { AuthGuard } from './guards/auth-guard';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [
        ConfigModule
    ],
    providers: [
        JwtVerifierService,
        AuthGuard
    ],
    exports: [
        JwtVerifierService,
        AuthGuard,
    ]
})
export class AuthModule {}
