import { registerAs } from "@nestjs/config";

export interface RedisConfig {
    host: string;
    port: number;
    password: string;
    tls: boolean;
}

export default registerAs('redis', (): RedisConfig => ({
    host: process.env.REDIS_HOST ?? '',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD ?? '',
    tls: process.env.REDIS_TLS === 'true' ? true : false,
}))