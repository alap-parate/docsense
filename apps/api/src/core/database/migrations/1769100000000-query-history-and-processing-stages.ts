import { MigrationInterface, QueryRunner } from "typeorm";

export class QueryHistoryAndProcessingStages1769100000000 implements MigrationInterface {
    name = 'QueryHistoryAndProcessingStages1769100000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "query_history" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT now(),
                "deletedAt" TIMESTAMP WITH TIME ZONE,
                "tenant_id" uuid NOT NULL,
                "user_id" uuid NOT NULL,
                "query" text NOT NULL,
                "query_mode" character varying(32) NOT NULL,
                "confidence" character varying(16),
                "total_chunks_retrieved" integer NOT NULL DEFAULT 0,
                "rerank_score" float,
                "total_time_ms" integer NOT NULL DEFAULT 0,
                "documents_used" jsonb,
                "citations" jsonb,
                CONSTRAINT "PK_query_history" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            ALTER TABLE "processing_jobs"
            ADD COLUMN "stage" character varying(64),
            ADD COLUMN "stage_timings" jsonb
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "processing_jobs"
            DROP COLUMN "stage",
            DROP COLUMN "stage_timings"
        `);
        await queryRunner.query(`DROP TABLE "query_history"`);
    }
}
