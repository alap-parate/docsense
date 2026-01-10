import { Module } from '@nestjs/common';
import { JwtVerifierService } from './services/jwt-verifier.service';
import { AuthGuard } from './guards/auth-guard';
import { ConfigModule } from '@nestjs/config';
import { AuthService } from './services/auth.service';
import { UsersModule } from 'src/modules/users/users.module';

@Module({
    imports: [
        ConfigModule,
        UsersModule
    ],
    providers: [
        JwtVerifierService,
        AuthGuard,
        AuthService
    ],
    exports: [
        JwtVerifierService,
        AuthService,
        AuthGuard,
    ]
})
export class AuthModule {}
