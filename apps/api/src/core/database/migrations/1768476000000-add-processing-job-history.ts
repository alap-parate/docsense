import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProcessingJobHistory1768476000000 implements MigrationInterface {
    name = 'AddProcessingJobHistory1768476000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "processing_jobs" ADD "stage_history" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "processing_jobs" DROP COLUMN "stage_history"`);
    }
}
