import { MigrationInterface, QueryRunner } from "typeorm";

export class UniqueContraints1767978657693 implements MigrationInterface {
    name = 'UniqueContraints1767978657693'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "UQ_41cce16a0d8494a61114b6796e9" UNIQUE ("external_user_id")`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email")`);
        await queryRunner.query(`ALTER TABLE "tenant_invitations" DROP CONSTRAINT "FK_662745ea8f58475b589d587201a"`);
        await queryRunner.query(`ALTER TABLE "tenant_invitations" ADD CONSTRAINT "UQ_662745ea8f58475b589d587201a" UNIQUE ("tenant_id")`);
        await queryRunner.query(`ALTER TABLE "tenant_invitations" ADD CONSTRAINT "UQ_b77424e8049ff41872f6b0291ab" UNIQUE ("email")`);
        await queryRunner.query(`ALTER TABLE "tenant_invitations" ADD CONSTRAINT "UQ_b05e46fe9993b5ce112b7c5fcda" UNIQUE ("token_hash")`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "UQ_d2dc61a505fa91613a199005cc2" UNIQUE ("external_user_id", "email")`);
        await queryRunner.query(`ALTER TABLE "tenant_users" ADD CONSTRAINT "UQ_c31836bba2a963168270fd8e475" UNIQUE ("tenant_id", "user_id")`);
        await queryRunner.query(`ALTER TABLE "tenant_invitations" ADD CONSTRAINT "UQ_a6e012c393556bd0744e2324a64" UNIQUE ("tenant_id", "email")`);
        await queryRunner.query(`ALTER TABLE "tenant_invitations" ADD CONSTRAINT "FK_662745ea8f58475b589d587201a" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tenant_invitations" DROP CONSTRAINT "FK_662745ea8f58475b589d587201a"`);
        await queryRunner.query(`ALTER TABLE "tenant_invitations" DROP CONSTRAINT "UQ_a6e012c393556bd0744e2324a64"`);
        await queryRunner.query(`ALTER TABLE "tenant_users" DROP CONSTRAINT "UQ_c31836bba2a963168270fd8e475"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "UQ_d2dc61a505fa91613a199005cc2"`);
        await queryRunner.query(`ALTER TABLE "tenant_invitations" DROP CONSTRAINT "UQ_b05e46fe9993b5ce112b7c5fcda"`);
        await queryRunner.query(`ALTER TABLE "tenant_invitations" DROP CONSTRAINT "UQ_b77424e8049ff41872f6b0291ab"`);
        await queryRunner.query(`ALTER TABLE "tenant_invitations" DROP CONSTRAINT "UQ_662745ea8f58475b589d587201a"`);
        await queryRunner.query(`ALTER TABLE "tenant_invitations" ADD CONSTRAINT "FK_662745ea8f58475b589d587201a" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "UQ_41cce16a0d8494a61114b6796e9"`);
    }

}
