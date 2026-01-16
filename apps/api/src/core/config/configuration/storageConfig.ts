import { registerAs } from "@nestjs/config";

export interface StorageConfig {
    endpoint: string;
    access_key: string;
    secret_key: string;
    bucket: string;
    region?: string;
}

export default registerAs('storage', (): StorageConfig => ({
    endpoint: process.env.MINIO_ENDPOINT ?? '',
    access_key: process.env.MINIO_ACCESS_KEY ?? '',
    secret_key: process.env.MINIO_SECRET_KEY ?? '',
    bucket: process.env.MINIO_BUCKET ?? '',
    region: process.env.MINIO_REGION,
}));
