import { MigrationInterface, QueryRunner } from "typeorm";

export class Usertable1767957390811 implements MigrationInterface {
    name = 'Usertable1767957390811'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "fname" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD "lname" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "lname"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "fname"`);
    }

}
