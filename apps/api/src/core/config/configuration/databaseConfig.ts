import { registerAs } from "@nestjs/config";
import jwt from "jsonwebtoken";

export interface DbConfig {
    host: string;
    port: number;
    userName: string;
    password: string;
    name: string;
    ssl: boolean;
    retryAttempts: number;
    retryDelay: number;
    schema: string;
}

export default registerAs('database', (): DbConfig => ({
    host: process.env.DB_HOST!,
    port: Number(process.env.DB_PORT),
    userName: process.env.DB_USERNAME!,
    password: process.env.DB_PASSWORD!,
    name: process.env.DB_NAME!,
    schema: process.env.DB_SCHEMA ?? 'public',
    ssl: process.env.DB_SSL === 'true' ? true : false,
    retryAttempts: Number(process.env.DB_RETRY_ATTEMPTS) ?? 5,
    retryDelay: Number(process.env.DB_RETRY_DELAY) ?? 3000
}))