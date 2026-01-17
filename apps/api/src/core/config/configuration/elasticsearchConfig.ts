import { registerAs } from "@nestjs/config";

export interface ElasticsearchConfig {
    node: string;
    username?: string;
    password?: string;
    ssl?: {
        rejectUnauthorized: boolean;
    };
}

export default registerAs('elasticsearch', (): ElasticsearchConfig => ({
    node: process.env.ELASTICSEARCH_NODE ?? 'http://localhost:9200',
    username: process.env.ELASTICSEARCH_USERNAME,
    password: process.env.ELASTICSEARCH_PASSWORD,
    ssl: process.env.ELASTICSEARCH_SSL === 'true' 
        ? { rejectUnauthorized: false } 
        : undefined,
}));
