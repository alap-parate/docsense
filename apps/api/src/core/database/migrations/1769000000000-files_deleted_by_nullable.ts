import { MigrationInterface, QueryRunner } from "typeorm";

export class FilesDeletedByNullable1769000000000 implements MigrationInterface {
    name = 'FilesDeletedByNullable1769000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "files" ALTER COLUMN "deleted_by" DROP NOT NULL`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "files" ALTER COLUMN "deleted_by" SET NOT NULL`
        );
    }
}
