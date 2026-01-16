import { MigrationInterface, QueryRunner } from "typeorm";

export class Asd1768564720490 implements MigrationInterface {
    name = 'Asd1768564720490'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."files_status_enum" RENAME TO "files_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."files_status_enum" AS ENUM('UPLOAD_PENDING', 'UPLOADED', 'PROCESSING', 'READY', 'FAILED')`);
        await queryRunner.query(`ALTER TABLE "files" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "files" ALTER COLUMN "status" TYPE "public"."files_status_enum" USING "status"::"text"::"public"."files_status_enum"`);
        await queryRunner.query(`ALTER TABLE "files" ALTER COLUMN "status" SET DEFAULT 'UPLOAD_PENDING'`);
        await queryRunner.query(`DROP TYPE "public"."files_status_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."files_status_enum_old" AS ENUM('UPLOADED', 'PROCESSING', 'READY', 'FAILED')`);
        await queryRunner.query(`ALTER TABLE "files" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "files" ALTER COLUMN "status" TYPE "public"."files_status_enum_old" USING "status"::"text"::"public"."files_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "files" ALTER COLUMN "status" SET DEFAULT 'UPLOADED'`);
        await queryRunner.query(`DROP TYPE "public"."files_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."files_status_enum_old" RENAME TO "files_status_enum"`);
    }

}
