import { Module } from '@nestjs/common';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { ConfigModule, ConfigService } from '@nestjs/config';
import elasticsearchConfig from '../config/configuration/elasticsearchConfig';
import type { ConfigType } from '@nestjs/config';

@Module({
    imports: [
        ElasticsearchModule.registerAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => {
                const config = configService.get<ConfigType<typeof elasticsearchConfig>>('elasticsearch');
                const node = config?.node ?? 'http://localhost:9200';
                
                // If node URL is HTTPS, we need SSL config (even if not explicitly set)
                // Self-signed certificates need rejectUnauthorized: false
                const isHttps = node.startsWith('https://');
                const sslConfig = config?.ssl || (isHttps ? { rejectUnauthorized: false } : undefined);
                
                return {
                    node,
                    auth: config?.username && config?.password
                        ? {
                            username: config.username,
                            password: config.password,
                        }
                        : undefined,
                    ...(sslConfig && { ssl: sslConfig }), // Only include ssl if configured
                    maxRetries: 3,
                    requestTimeout: 30000, // 30 seconds
                    pingTimeout: 3000, // 3 seconds
                };
            },
            inject: [ConfigService],
        }),
    ],
    exports: [ElasticsearchModule],
})
export class ElasticModule {}
