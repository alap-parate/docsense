import { MigrationInterface, QueryRunner } from "typeorm";

export class QueryHistoryAbortField1769449286191 implements MigrationInterface {
    name = 'QueryHistoryAbortField1769449286191'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "query_history" ADD "aborted" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "query_history" DROP COLUMN "aborted"`);
    }

}
