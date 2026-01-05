import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import configs from './configuration'

@Module({
    imports: [
        NestConfigModule.forRoot({
            isGlobal: true,
            // envFilePath: [`.env.${process.env.NODE_ENV ? `${process.env.NOE_ENV}` : ''}`],
            envFilePath:'.env.development',
            load: configs ,
            cache: true
        })
    ],
    exports: [NestConfigModule],
})
export class ConfigModule {}