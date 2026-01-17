import { Module } from '@nestjs/common';
import { ConfigService, ConfigType } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import redisConfig from 'src/core/config/configuration/redisConfig';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redis = configService.get<ConfigType<typeof redisConfig>>('redis');
        return {
          connection: {
            host: redis?.host ?? 'localhost',
            port: redis?.port ?? 6379,
            password: redis?.password,
            ...(redis?.tls ? { tls: {} } : {}),
          },

          // IMPORTANT
          sharedConnection: true,
        };
      },
    }),
  ],
  exports: [BullModule],
})
export class BullMqModule {}
