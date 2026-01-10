import { MigrationInterface, QueryRunner } from "typeorm";

export class UniqueContraints1767981542525 implements MigrationInterface {
    name = 'UniqueContraints1767981542525'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "provider" character varying NOT NULL DEFAULT 'email'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "provider"`);
    }

}
