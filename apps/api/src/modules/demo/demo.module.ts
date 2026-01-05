import { Module } from '@nestjs/common';
import { DemoController } from './demo.controller';
import { JwtVerifierService } from 'src/core/auth/services/jwt-verifier.service';
import { AuthModule } from 'src/core/auth/auth.module';

@Module({
    imports: [AuthModule],
  controllers: [DemoController],
})
export class DemoModule {}
