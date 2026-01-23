import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixTenantInvitationsUniqueConstraints1769200000000
    implements MigrationInterface
{
    name = 'FixTenantInvitationsUniqueConstraints1769200000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check and drop incorrect unique constraints if they exist
        // These were added in 1767978657693 but are too restrictive:
        // - UQ_662745ea8f58475b589d587201a: UNIQUE on tenant_id alone (wrong - only one invite per tenant)
        // - UQ_b77424e8049ff41872f6b0291ab: UNIQUE on email alone (wrong - same email can be in different tenants)

        const constraints = await queryRunner.query(`
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'tenant_invitations' 
            AND constraint_type = 'UNIQUE'
            AND constraint_name IN (
                'UQ_662745ea8f58475b589d587201a',
                'UQ_b77424e8049ff41872f6b0291ab'
            )
        `);

        for (const constraint of constraints) {
            await queryRunner.query(
                `ALTER TABLE "tenant_invitations" DROP CONSTRAINT "${constraint.constraint_name}"`,
            );
        }

        // Ensure the correct composite unique constraint exists
        // This allows multiple emails per tenant, but not the same email twice for the same tenant
        const existingComposite = await queryRunner.query(`
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'tenant_invitations' 
            AND constraint_type = 'UNIQUE'
            AND constraint_name = 'UQ_a6e012c393556bd0744e2324a64'
        `);

        if (existingComposite.length === 0) {
            await queryRunner.query(
                `ALTER TABLE "tenant_invitations" ADD CONSTRAINT "UQ_a6e012c393556bd0744e2324a64" UNIQUE ("tenant_id", "email")`,
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Re-add the incorrect constraints (for rollback)
        await queryRunner.query(
            `ALTER TABLE "tenant_invitations" ADD CONSTRAINT "UQ_662745ea8f58475b589d587201a" UNIQUE ("tenant_id")`,
        );
        await queryRunner.query(
            `ALTER TABLE "tenant_invitations" ADD CONSTRAINT "UQ_b77424e8049ff41872f6b0291ab" UNIQUE ("email")`,
        );
    }
}
