import { registerAs } from "@nestjs/config";

export type NodeEnv = 'development' | 'production' | 'test' | 'staging';

export interface AppConfig {
    port: number;
    nodeEnv: NodeEnv
}

export default registerAs('app', (): AppConfig => ({
    port: Number(process.env.PORT ?? 3000),
    nodeEnv: (process.env.NODE_ENV ?? 'development') as NodeEnv
}))