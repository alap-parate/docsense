import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1767701080028 implements MigrationInterface {
    name = 'Init1767701080028'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."users_status_enum" AS ENUM('0', '1')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "external_user_id" character varying NOT NULL, "email" character varying NOT NULL, "status" "public"."users_status_enum" NOT NULL DEFAULT '0', CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."tenants_status_enum" AS ENUM('ACTIVE', 'SUSPENDED')`);
        await queryRunner.query(`CREATE TABLE "tenants" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "name" character varying NOT NULL, "status" "public"."tenants_status_enum" NOT NULL DEFAULT 'ACTIVE', "created_by" uuid NOT NULL, CONSTRAINT "PK_53be67a04681c66b87ee27c9321" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."tenant_users_role_enum" AS ENUM('OWNER', 'EDITOR', 'MEMBER', 'VIEWER')`);
        await queryRunner.query(`CREATE TYPE "public"."tenant_users_status_enum" AS ENUM('ACTIVE', 'INVITED', 'REMOVED')`);
        await queryRunner.query(`CREATE TABLE "tenant_users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "tenant_id" uuid NOT NULL, "user_id" uuid NOT NULL, "role" "public"."tenant_users_role_enum" NOT NULL DEFAULT 'MEMBER', "status" "public"."tenant_users_status_enum" NOT NULL DEFAULT 'INVITED', "joined_at" TIMESTAMP WITH TIME ZONE, "created_by" uuid NOT NULL, "updated_by" uuid, CONSTRAINT "PK_8ce1bc9e3a5887c234900365447" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."tenant_invitations_role_enum" AS ENUM('OWNER', 'EDITOR', 'MEMBER', 'VIEWER')`);
        await queryRunner.query(`CREATE TYPE "public"."tenant_invitations_status_enum" AS ENUM('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED')`);
        await queryRunner.query(`CREATE TABLE "tenant_invitations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "tenant_id" uuid NOT NULL, "email" character varying NOT NULL, "role" "public"."tenant_invitations_role_enum" NOT NULL DEFAULT 'MEMBER', "token_hash" text NOT NULL, "status" "public"."tenant_invitations_status_enum" NOT NULL DEFAULT 'PENDING', "expires_at" TIMESTAMP WITH TIME ZONE, "invited_at" TIMESTAMP WITH TIME ZONE NOT NULL, "accepted_by" uuid, "created_by" uuid NOT NULL, "updated_by" uuid, CONSTRAINT "PK_830d0f78b435fdcf23b84cc28da" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "folders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "tenant_id" uuid NOT NULL, "parent_id" uuid, "name" character varying NOT NULL, "path" ltree NOT NULL, "created_by" uuid NOT NULL, "updated_by" uuid NOT NULL, "deleted_by" uuid NOT NULL, "parentId" uuid, CONSTRAINT "PK_8578bd31b0e7f6d6c2480dbbca8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."files_status_enum" AS ENUM('UPLOADED', 'PROCESSING', 'READY', 'FAILED')`);
        await queryRunner.query(`CREATE TABLE "files" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "tenant_id" uuid NOT NULL, "folder_id" uuid NOT NULL, "name" character varying NOT NULL, "original_name" character varying NOT NULL, "mime_type" character varying NOT NULL, "size_bytes" bigint NOT NULL, "storage_key" character varying NOT NULL, "status" "public"."files_status_enum" NOT NULL DEFAULT 'UPLOADED', "uploaded_by" uuid NOT NULL, "deleted_by" uuid NOT NULL, CONSTRAINT "PK_6c16b9093a142e0e7613b04a3d9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."notifications_type_enum" AS ENUM('USER_JOINED', 'FILE_UPLOADED', 'FILE_PROCESSED', 'INVITED', 'UNKNOWN')`);
        await queryRunner.query(`CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "tenant_id" uuid NOT NULL, "user_id" uuid NOT NULL, "type" "public"."notifications_type_enum" NOT NULL DEFAULT 'UNKNOWN', "title" character varying NOT NULL, "message" character varying NOT NULL, "payload" jsonb, "is_read" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."processing_jobs_type_enum" AS ENUM('OCR', 'INDEX')`);
        await queryRunner.query(`CREATE TYPE "public"."processing_jobs_status_enum" AS ENUM('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')`);
        await queryRunner.query(`CREATE TABLE "processing_jobs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "file_id" uuid NOT NULL, "type" "public"."processing_jobs_type_enum" NOT NULL DEFAULT 'INDEX', "status" "public"."processing_jobs_status_enum" NOT NULL DEFAULT 'PENDING', "error" text, CONSTRAINT "PK_fd8dafc69f177c1f23505072188" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "document_pages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "file_id" uuid NOT NULL, "page_number" integer NOT NULL, "text_content" text NOT NULL, "checksum" character varying NOT NULL, CONSTRAINT "PK_ea1fc914b2cf104d0f19050e801" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "tenant_id" uuid NOT NULL, "user_id" uuid NOT NULL, "action" character varying NOT NULL, "entity" character varying NOT NULL, "entity_id" uuid NOT NULL, "metadata" jsonb NOT NULL, CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "tenants" ADD CONSTRAINT "FK_362ad28591b5e679733c37b1151" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tenant_users" ADD CONSTRAINT "FK_e2634cc4d794a376f812c652cd2" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tenant_users" ADD CONSTRAINT "FK_ad7cb17ad075ab8a5634ca8ab22" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tenant_users" ADD CONSTRAINT "FK_85a7f13b3f434940151fb44f4c1" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tenant_users" ADD CONSTRAINT "FK_d53e87bfe2cfc2bf22180bb5f73" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tenant_invitations" ADD CONSTRAINT "FK_662745ea8f58475b589d587201a" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tenant_invitations" ADD CONSTRAINT "FK_17127f0e8b983f4949f8f61467d" FOREIGN KEY ("accepted_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tenant_invitations" ADD CONSTRAINT "FK_13a55b991879e73a26d92ecbb32" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tenant_invitations" ADD CONSTRAINT "FK_59c1544235555b2244e7434b421" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "folders" ADD CONSTRAINT "FK_1028720cd998ada727c1042ed30" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "folders" ADD CONSTRAINT "FK_dc9b0a1095e7d48ca27df340faa" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "folders" ADD CONSTRAINT "FK_c7617ed8a30f89e196e3f9918fc" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "folders" ADD CONSTRAINT "FK_9d2442d00527b798fefeae83f0f" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "folders" ADD CONSTRAINT "FK_1be2fce400dcc657602d336f23f" FOREIGN KEY ("parentId") REFERENCES "folders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "files" ADD CONSTRAINT "FK_63c92c51cd7fd95c2d79d709b61" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "files" ADD CONSTRAINT "FK_c21906fde5d27064246f271d5ee" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "files" ADD CONSTRAINT "FK_484acb2ff8f3e134dfac8f01e8a" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "files" ADD CONSTRAINT "FK_27bc84e6954d2fa309a4f61326f" FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_d93ddd7e1b890535ecafbb334ec" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_9a8a82462cab47c73d25f49261f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "processing_jobs" ADD CONSTRAINT "FK_9d01d5d1e52a134e264eea7e33a" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "document_pages" ADD CONSTRAINT "FK_799b4f7f05ab8104833cb24773a" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_6f18d459490bb48923b1f40bdb7" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_bd2726fd31b35443f2245b93ba0" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_bd2726fd31b35443f2245b93ba0"`);
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_6f18d459490bb48923b1f40bdb7"`);
        await queryRunner.query(`ALTER TABLE "document_pages" DROP CONSTRAINT "FK_799b4f7f05ab8104833cb24773a"`);
        await queryRunner.query(`ALTER TABLE "processing_jobs" DROP CONSTRAINT "FK_9d01d5d1e52a134e264eea7e33a"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_9a8a82462cab47c73d25f49261f"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_d93ddd7e1b890535ecafbb334ec"`);
        await queryRunner.query(`ALTER TABLE "files" DROP CONSTRAINT "FK_27bc84e6954d2fa309a4f61326f"`);
        await queryRunner.query(`ALTER TABLE "files" DROP CONSTRAINT "FK_484acb2ff8f3e134dfac8f01e8a"`);
        await queryRunner.query(`ALTER TABLE "files" DROP CONSTRAINT "FK_c21906fde5d27064246f271d5ee"`);
        await queryRunner.query(`ALTER TABLE "files" DROP CONSTRAINT "FK_63c92c51cd7fd95c2d79d709b61"`);
        await queryRunner.query(`ALTER TABLE "folders" DROP CONSTRAINT "FK_1be2fce400dcc657602d336f23f"`);
        await queryRunner.query(`ALTER TABLE "folders" DROP CONSTRAINT "FK_9d2442d00527b798fefeae83f0f"`);
        await queryRunner.query(`ALTER TABLE "folders" DROP CONSTRAINT "FK_c7617ed8a30f89e196e3f9918fc"`);
        await queryRunner.query(`ALTER TABLE "folders" DROP CONSTRAINT "FK_dc9b0a1095e7d48ca27df340faa"`);
        await queryRunner.query(`ALTER TABLE "folders" DROP CONSTRAINT "FK_1028720cd998ada727c1042ed30"`);
        await queryRunner.query(`ALTER TABLE "tenant_invitations" DROP CONSTRAINT "FK_59c1544235555b2244e7434b421"`);
        await queryRunner.query(`ALTER TABLE "tenant_invitations" DROP CONSTRAINT "FK_13a55b991879e73a26d92ecbb32"`);
        await queryRunner.query(`ALTER TABLE "tenant_invitations" DROP CONSTRAINT "FK_17127f0e8b983f4949f8f61467d"`);
        await queryRunner.query(`ALTER TABLE "tenant_invitations" DROP CONSTRAINT "FK_662745ea8f58475b589d587201a"`);
        await queryRunner.query(`ALTER TABLE "tenant_users" DROP CONSTRAINT "FK_d53e87bfe2cfc2bf22180bb5f73"`);
        await queryRunner.query(`ALTER TABLE "tenant_users" DROP CONSTRAINT "FK_85a7f13b3f434940151fb44f4c1"`);
        await queryRunner.query(`ALTER TABLE "tenant_users" DROP CONSTRAINT "FK_ad7cb17ad075ab8a5634ca8ab22"`);
        await queryRunner.query(`ALTER TABLE "tenant_users" DROP CONSTRAINT "FK_e2634cc4d794a376f812c652cd2"`);
        await queryRunner.query(`ALTER TABLE "tenants" DROP CONSTRAINT "FK_362ad28591b5e679733c37b1151"`);
        await queryRunner.query(`DROP TABLE "audit_logs"`);
        await queryRunner.query(`DROP TABLE "document_pages"`);
        await queryRunner.query(`DROP TABLE "processing_jobs"`);
        await queryRunner.query(`DROP TYPE "public"."processing_jobs_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."processing_jobs_type_enum"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
        await queryRunner.query(`DROP TABLE "files"`);
        await queryRunner.query(`DROP TYPE "public"."files_status_enum"`);
        await queryRunner.query(`DROP TABLE "folders"`);
        await queryRunner.query(`DROP TABLE "tenant_invitations"`);
        await queryRunner.query(`DROP TYPE "public"."tenant_invitations_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."tenant_invitations_role_enum"`);
        await queryRunner.query(`DROP TABLE "tenant_users"`);
        await queryRunner.query(`DROP TYPE "public"."tenant_users_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."tenant_users_role_enum"`);
        await queryRunner.query(`DROP TABLE "tenants"`);
        await queryRunner.query(`DROP TYPE "public"."tenants_status_enum"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
    }

}
