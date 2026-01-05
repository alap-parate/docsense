import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config as loadEnv } from 'dotenv';
import path from 'path';

loadEnv({
  path: process.env.NODE_ENV === 'production'
    ? '.env'
    : '.env.development',
});

const rootDir = process.cwd();

const dataSource = new DataSource({
  type: 'postgres',

  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  schema: process.env.DB_SCHEMA ?? 'public',

  // CLI → TS entities (TypeScript files - no build needed with typeorm-ts-node-esm)
  entities: [
    `${rootDir}/src/**/*.entity.ts`,
  ],

  // CLI → TS migrations (TypeScript files - no build needed with typeorm-ts-node-esm)
  migrations: [
    `${rootDir}/src/core/database/migrations/*.ts`,
  ],

  synchronize: false,
  logging: true,

  ssl: process.env.DB_SSL === 'true'
    ? { rejectUnauthorized: false }
    : false,
});

export default dataSource;
