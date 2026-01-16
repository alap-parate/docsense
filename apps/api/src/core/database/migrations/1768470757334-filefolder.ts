import { MigrationInterface, QueryRunner } from "typeorm";

export class Filefolder1768470757334 implements MigrationInterface {
    name = 'Filefolder1768470757334'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "folders" DROP CONSTRAINT "FK_1be2fce400dcc657602d336f23f"`);
        await queryRunner.query(`ALTER TABLE "tenant_invitations" DROP CONSTRAINT "UQ_a6e012c393556bd0744e2324a64"`);
        await queryRunner.query(`ALTER TABLE "folders" DROP COLUMN "parentId"`);
        await queryRunner.query(`ALTER TABLE "tenant_users" ADD "deleted_by" uuid`);
        await queryRunner.query(`ALTER TABLE "tenant_invitations" ADD "user_id" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "document_pages" ADD "tenant_id" uuid NOT NULL`);
        await queryRunner.query(`ALTER TYPE "public"."users_status_enum" RENAME TO "users_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."users_status_enum" AS ENUM('ACTIVE', 'BLOCKED')`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "status" TYPE "public"."users_status_enum" USING (CASE "status"::"text" WHEN '0' THEN 'ACTIVE' WHEN '1' THEN 'BLOCKED' ELSE "status"::"text" END)::"public"."users_status_enum"`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'`);
        await queryRunner.query(`DROP TYPE "public"."users_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "folders" DROP CONSTRAINT "FK_c7617ed8a30f89e196e3f9918fc"`);
        await queryRunner.query(`ALTER TABLE "folders" ALTER COLUMN "deleted_by" DROP NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_faadc246c5e89532d035ccfe75" ON "folders" ("tenant_id", "parent_id", "name") `);
        await queryRunner.query(`CREATE INDEX "IDX_a668896d1c0520342a5b7634db" ON "folders" ("tenant_id", "path") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_b94745acee03b5d50d03fd50f9" ON "files" ("tenant_id", "folder_id", "name") `);
        await queryRunner.query(`CREATE INDEX "IDX_8cd95e8db6e792d80fef3449ae" ON "files" ("tenant_id", "folder_id") `);
        await queryRunner.query(`ALTER TABLE "tenant_invitations" ADD CONSTRAINT "UQ_a451bd2b6f92a402febc0241440" UNIQUE ("tenant_id", "user_id")`);
        await queryRunner.query(`ALTER TABLE "tenant_users" ADD CONSTRAINT "FK_dc8d6bb62cb0bcfa3976def7f8c" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tenant_invitations" ADD CONSTRAINT "FK_9be244e2e12658a62b5177215c3" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "folders" ADD CONSTRAINT "FK_c7617ed8a30f89e196e3f9918fc" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "folders" ADD CONSTRAINT "FK_938a930768697b6ece215667d8e" FOREIGN KEY ("parent_id") REFERENCES "folders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "document_pages" ADD CONSTRAINT "FK_aab4f0ff89c9ff8f42652bb5dee" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "document_pages" DROP CONSTRAINT "FK_aab4f0ff89c9ff8f42652bb5dee"`);
        await queryRunner.query(`ALTER TABLE "folders" DROP CONSTRAINT "FK_938a930768697b6ece215667d8e"`);
        await queryRunner.query(`ALTER TABLE "folders" DROP CONSTRAINT "FK_c7617ed8a30f89e196e3f9918fc"`);
        await queryRunner.query(`ALTER TABLE "tenant_invitations" DROP CONSTRAINT "FK_9be244e2e12658a62b5177215c3"`);
        await queryRunner.query(`ALTER TABLE "tenant_users" DROP CONSTRAINT "FK_dc8d6bb62cb0bcfa3976def7f8c"`);
        await queryRunner.query(`ALTER TABLE "tenant_invitations" DROP CONSTRAINT "UQ_a451bd2b6f92a402febc0241440"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8cd95e8db6e792d80fef3449ae"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b94745acee03b5d50d03fd50f9"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a668896d1c0520342a5b7634db"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_faadc246c5e89532d035ccfe75"`);
        await queryRunner.query(`ALTER TABLE "folders" ALTER COLUMN "deleted_by" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "folders" ADD CONSTRAINT "FK_c7617ed8a30f89e196e3f9918fc" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`CREATE TYPE "public"."users_status_enum_old" AS ENUM('0', '1')`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "status" TYPE "public"."users_status_enum_old" USING "status"::"text"::"public"."users_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT '0'`);
        await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."users_status_enum_old" RENAME TO "users_status_enum"`);
        await queryRunner.query(`ALTER TABLE "document_pages" DROP COLUMN "tenant_id"`);
        await queryRunner.query(`ALTER TABLE "tenant_invitations" DROP COLUMN "user_id"`);
        await queryRunner.query(`ALTER TABLE "tenant_users" DROP COLUMN "deleted_by"`);
        await queryRunner.query(`ALTER TABLE "folders" ADD "parentId" uuid`);
        await queryRunner.query(`ALTER TABLE "tenant_invitations" ADD CONSTRAINT "UQ_a6e012c393556bd0744e2324a64" UNIQUE ("email", "tenant_id")`);
        await queryRunner.query(`ALTER TABLE "folders" ADD CONSTRAINT "FK_1be2fce400dcc657602d336f23f" FOREIGN KEY ("parentId") REFERENCES "folders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
