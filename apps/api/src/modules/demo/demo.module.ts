import { Module } from '@nestjs/common';
import { DemoController } from './demo.controller';
import { AuthModule } from 'src/core/auth/auth.module';

@Module({
  imports: [
    AuthModule
  ],
  controllers: [DemoController]
})
export class DemoModule {}
