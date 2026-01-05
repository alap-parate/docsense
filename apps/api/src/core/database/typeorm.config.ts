import { TypeOrmModuleOptions } from "@nestjs/typeorm"
import databaseConfig from "../config/configuration/databaseConfig"

const db = databaseConfig();

export const typeOrmConfig = (): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: db.host,
    port: db.port,
    username: db.userName,
    password: db.password,
    ssl: db.ssl ? { rejectUnauthorized: false } : false,
    database: db.name,
    schema: db.schema,

    retryAttempts: db.retryAttempts,
    retryDelay: db.retryDelay,

    entities: ['src/**/*.entity.{ts}'],
    autoLoadEntities: true,
    migrations: ['src/core/database/migrations/*.{ts}'],
    migrationsRun: false,
    migrationsTransactionMode: 'all',
    

    synchronize: false,
    logging: process.env.NODE_ENV !== 'production',

}) 