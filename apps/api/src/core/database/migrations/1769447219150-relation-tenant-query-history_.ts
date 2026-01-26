import { MigrationInterface, QueryRunner } from "typeorm";

export class RelationTenantQueryHistory_1769447219150 implements MigrationInterface {
    name = 'RelationTenantQueryHistory_1769447219150'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "query_history" DROP CONSTRAINT "FK_8662ec50511259be3076f9c81a3"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "query_history" ADD CONSTRAINT "FK_8662ec50511259be3076f9c81a3" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
