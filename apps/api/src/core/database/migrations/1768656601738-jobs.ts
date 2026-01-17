import { MigrationInterface, QueryRunner } from "typeorm";

export class Jobs1768656601738 implements MigrationInterface {
    name = 'Jobs1768656601738'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "processing_jobs" ADD "job_id" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "processing_jobs" DROP COLUMN "job_id"`);
    }

}
