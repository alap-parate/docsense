import { MigrationInterface, QueryRunner } from "typeorm";

export class QueryResponseStore1769448856220 implements MigrationInterface {
    name = 'QueryResponseStore1769448856220'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "query_history" ADD "response" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "query_history" DROP COLUMN "response"`);
    }

}
