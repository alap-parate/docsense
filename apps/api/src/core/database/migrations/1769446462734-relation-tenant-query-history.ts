import { MigrationInterface, QueryRunner } from "typeorm";

export class RelationTenantQueryHistory1769446462734 implements MigrationInterface {
    name = 'RelationTenantQueryHistory1769446462734'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tenant_invitations" DROP CONSTRAINT "UQ_a451bd2b6f92a402febc0241440"`);
        await queryRunner.query(`ALTER TABLE "tenant_invitations" DROP CONSTRAINT "UQ_tenant_invitations_tenant_email"`);
        await queryRunner.query(`ALTER TABLE "tenant_invitations" ADD CONSTRAINT "UQ_a6e012c393556bd0744e2324a64" UNIQUE ("tenant_id", "email")`);
        await queryRunner.query(`ALTER TABLE "query_history" ADD CONSTRAINT "FK_8662ec50511259be3076f9c81a3" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "query_history" DROP CONSTRAINT "FK_8662ec50511259be3076f9c81a3"`);
        await queryRunner.query(`ALTER TABLE "tenant_invitations" DROP CONSTRAINT "UQ_a6e012c393556bd0744e2324a64"`);
        await queryRunner.query(`ALTER TABLE "tenant_invitations" ADD CONSTRAINT "UQ_tenant_invitations_tenant_email" UNIQUE ("tenant_id", "email")`);
        await queryRunner.query(`ALTER TABLE "tenant_invitations" ADD CONSTRAINT "UQ_a451bd2b6f92a402febc0241440" UNIQUE ("tenant_id", "user_id")`);
    }

}
