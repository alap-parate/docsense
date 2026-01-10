import { MigrationInterface, QueryRunner } from "typeorm";

export class UniqueContraints1767980174790 implements MigrationInterface {
    name = 'UniqueContraints1767980174790'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "UQ_d2dc61a505fa91613a199005cc2"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "UQ_d2dc61a505fa91613a199005cc2" UNIQUE ("email", "external_user_id")`);
    }

}
