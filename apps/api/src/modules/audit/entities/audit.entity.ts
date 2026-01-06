import { BaseEntity } from "src/core/database/entities/base.entity";
import { Entity, Column, JoinColumn, ManyToOne } from "typeorm";
import { Users } from "src/modules/users/entities/users.entity";
import { Tenants } from "src/modules/tenants/entities/tenants.entity";

@Entity({
    name: 'audit_logs'
})
export class AuditLogs extends BaseEntity {

    @Column({ 
        name: 'tenant_id',
        type: 'uuid'
    })
    tenantId!: string;

    @Column({ 
        name: 'user_id',
        type: 'uuid'
    })
    userId!: string;

    @Column({ 
        name: 'action',
        type: 'varchar',
    })
    action!: string; 

    @Column({ 
        name: 'entity',
        type: 'varchar',
    })
    entity!: string; 

    @Column({ 
        name: 'entity_id',
        type: 'uuid',
    })
    entityId!: string; 

    @Column({ 
        name: 'metadata',
        type: 'jsonb',
    })
    metadata!: string; 

    @ManyToOne(() => Tenants, tenant => tenant.id, { nullable: false })
    @JoinColumn({ name: 'tenant_id' })
    tenant!: Tenants;

    @ManyToOne(() => Users, user => user.id, { nullable: false })
    @JoinColumn({ name: 'user_id' })
    user!: Users;
}