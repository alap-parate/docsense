import { BaseEntity } from "src/core/database/entities/base.entity";
import { Entity, Column, JoinColumn, ManyToOne } from "typeorm";
import { Users } from "src/modules/users/entities/users.entity";
import { Tenants } from "src/modules/tenants/entities/tenants.entity";

export enum NotificationTypes {
    USER_JOINED = 'USER_JOINED',
    FILE_UPLOADED = 'FILE_UPLOADED',
    FILE_PROCESSED = 'FILE_PROCESSED',
    INVITED = 'INVITED',
    UNKNOWN = 'UNKNOWN'
}

@Entity({
    name: 'notifications'
})
export class Notifications extends BaseEntity {

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
        name: 'type',
        type: 'enum',
        enum: NotificationTypes,
        default: NotificationTypes.UNKNOWN 
    })
    type!: NotificationTypes;

    @Column({ 
        name: 'title',
        type: 'varchar',
        nullable: false
    })
    title!: string;

    @Column({ 
        name: 'message',
        type: 'varchar',
        nullable: false
    })
    message!: string;

    
    @Column({ 
        name: 'payload',
        type: 'jsonb',
        nullable: true
    })
    payload?: string | null;

    @Column({
        name: 'is_read',
        type: 'boolean',
        default: false
    })
    isRead!: boolean;

    @ManyToOne(() => Tenants, tenant => tenant.id, { nullable: false })
    @JoinColumn({ name: 'tenant_id' })
    tenant!: Tenants;
    
    @ManyToOne(() => Users, user => user.id, { nullable: false })
    @JoinColumn({ name: 'user_id' })
    user!: Users;
}