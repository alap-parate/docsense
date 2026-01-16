import { Inject, Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadBucketCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import storageConfig from 'src/core/config/configuration/storageConfig';
import type { ConfigType } from '@nestjs/config';

@Injectable()
export class S3Service implements OnModuleInit {
    private readonly logger = new Logger(S3Service.name);
    private readonly client: S3Client;
    private readonly bucket: string;

    constructor(
        @Inject(storageConfig.KEY)
        private readonly storage: ConfigType<typeof storageConfig>
    ) {
        
        const endpoint = this.storage.endpoint;
        const accessKeyId = this.storage.access_key;
        const secretAccessKey = this.storage.secret_key;
        const bucket = this.storage.bucket;
        const region = this.storage.region ?? 'us-east-1';

        if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
            throw new Error(
                'Missing MinIO configuration. Set MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET.'
            );
        }

        this.bucket = bucket;
        this.client = new S3Client({
            region,
            endpoint,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
            forcePathStyle: true,
        });
    }

    async onModuleInit() {
        // Check bucket accessibility on module initialization
        await this.checkBucketAccessibility();
    }

    /**
     * Checks if the configured bucket exists and is accessible
     * @throws Error if bucket is not accessible
     */
    async checkBucketAccessibility(): Promise<void> {
        try {
            const command = new HeadBucketCommand({
                Bucket: this.bucket,
            });
            await this.client.send(command);
            this.logger.log(`Bucket '${this.bucket}' is accessible`);
        } catch (error: any) {
            const errorMessage = error.message || 'Unknown error';
            const errorCode = error.$metadata?.httpStatusCode;
            
            if (errorCode === 404) {
                throw new Error(
                    `Bucket '${this.bucket}' does not exist. ` +
                    `Please create the bucket in MinIO or update MINIO_BUCKET environment variable.`
                );
            } else if (errorCode === 403) {
                throw new Error(
                    `Access denied to bucket '${this.bucket}'. ` +
                    `Check MINIO_ACCESS_KEY and MINIO_SECRET_KEY permissions.`
                );
            } else {
                throw new Error(
                    `Failed to access bucket '${this.bucket}': ${errorMessage}. ` +
                    `Check MinIO endpoint (${this.storage.endpoint}) and network connectivity.`
                );
            }
        }
    }

    async getPresignedUploadUrl(
        key: string,
        contentType: string,
        expiresInSeconds = 3600
    ): Promise<string> {
        try {
            this.logger.debug(`Generating presigned URL for key: ${key}, bucket: ${this.bucket}`);
            
            const command = new PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                ContentType: contentType,
            });
            
            const url = await getSignedUrl(this.client, command, { 
                expiresIn: expiresInSeconds,
                // Ensure the key is properly included in the URL
                signableHeaders: new Set(['host']),
            });
            
            this.logger.debug(`Generated presigned URL: ${url.substring(0, 200)}...`);
            
            // Check if the URL contains the placeholder (MinIO/AWS SDK bug workaround)
            if (url.includes('{Key+}') || url.includes('{key+}')) {
                this.logger.error(`URL contains placeholder! Key: ${key}, URL: ${url}`);
                // Manually replace the placeholder with the actual key
                const encodedKey = encodeURIComponent(key).replace(/%2F/g, '/');
                const fixedUrl = url.replace(/\{Key\+\}/gi, encodedKey);
                this.logger.warn(`Fixed URL by replacing placeholder: ${fixedUrl.substring(0, 200)}...`);
                return fixedUrl;
            }
            
            // Verify the key is in the URL
            const encodedKey = encodeURIComponent(key).replace(/%2F/g, '/');
            if (!url.includes(key) && !url.includes(encodedKey)) {
                this.logger.warn(`Warning: Key '${key}' not found in generated URL. Attempting to fix...`);
                // Try to manually construct the URL if the SDK failed
                const baseUrl = new URL(this.storage.endpoint);
                const pathStyleUrl = `${baseUrl.protocol}//${baseUrl.host}${baseUrl.port ? `:${baseUrl.port}` : ''}/${this.bucket}/${key}`;
                // We can't manually sign, so this is just for logging
                this.logger.error(`Expected URL format: ${pathStyleUrl} (but we need SDK to sign it)`);
            }
            
            return url;
        } catch (error: any) {
            this.logger.error(`Failed to generate presigned URL: ${error.message}`, error.stack);
            throw new Error(
                `Failed to generate presigned URL: ${error.message || 'Unknown error'}. ` +
                `Check MinIO connection and bucket configuration.`
            );
        }
    }

    async deleteObject(key: string): Promise<void> {
        const command = new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: key,
        });
        await this.client.send(command);
    }

    async objectExists(key: string): Promise<boolean> {
        try {
            const command = new HeadObjectCommand({
                Bucket: this.bucket,
                Key: key,
            });
            await this.client.send(command);
            return true;
        } catch (error: any) {
            const code = error?.$metadata?.httpStatusCode;
            if (code === 404) {
                return false;
            }
            throw new Error(
                `Failed to check object '${key}': ${error.message || 'Unknown error'}`
            );
        }
    }
}
