import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtVerifierService } from './services/jwt-verifier.service';
import { AuthGuard } from './guards/auth-guard';
import { AuthService } from './services/auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from 'src/modules/users/users.module';

@Module({
    imports: [ConfigModule, UsersModule],
    controllers: [AuthController],
    providers: [JwtVerifierService, AuthGuard, AuthService],
    exports: [JwtVerifierService, AuthService, AuthGuard],
})
export class AuthModule {}
