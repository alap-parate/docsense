import { BaseEntity } from "src/core/database/entities/base.entity";
import { Entity, Column, JoinColumn, ManyToOne } from "typeorm";
import { Users } from "src/modules/users/entities/users.entity";
import { Tenants } from "./tenants.entity";
import { TenantRole } from "./tenant-users.entity";

export enum InvitationStatus {
    PENDING = 'PENDING',
    ACCEPTED = 'ACCEPTED',
    EXPIRED = 'EXPIRED',
    REVOKED = 'REVOKED'
}

@Entity({
    name: 'tenant_invitations'
})
export class TenantInvitations extends BaseEntity {

    @Column({ 
        name: 'tenant_id',
        type: 'uuid'
    })
    tenantId!: string;

    @Column({ 
        name: 'email',
        type: 'varchar'
    })
    email!: string;

    @Column({ 
        name: 'role',
        type: 'enum',
        enum: TenantRole,
        default: TenantRole.MEMBER 
    })
    role!: TenantRole;

    @Column({ 
        name: 'token_hash',
        type: 'text'
    })
    tokenHash!: string;

    @Column({ 
        name: 'status',
        type: 'enum',
        enum: InvitationStatus,
        default: InvitationStatus.PENDING 
    })
    status!: InvitationStatus;

    @Column({ 
        name: 'expires_at',
        type: 'timestamp with time zone',
        default: null
    })
    expiresAt?: Date; 

    @Column({ 
        name: 'invited_at',
        type: 'timestamp with time zone',
    })
    invitedAt?: Date; 

    @Column({
        name: 'accepted_by',
        type: 'uuid',
        nullable: true
    })
    acceptedById?: string | null;

    @Column({
        name: 'created_by',
        type: 'uuid',
        nullable: false
    })
    createdById!: string;

    @Column({
        name: 'updated_by',
        type: 'uuid',
        nullable: true
    })
    updatedById?: string | null;

    @ManyToOne(() => Tenants, tenant => tenant.id, { nullable: false })
    @JoinColumn({ name: 'tenant_id' })
    tenant!: Tenants;
    
    @ManyToOne(() => Users, user => user.id, { nullable: false })
    @JoinColumn({ name: 'accepted_by' })
    acceptedBy!: Users;
    
    @ManyToOne(() => Users, user => user.id, { nullable: false })
    @JoinColumn({ name: 'created_by' })
    createdBy!: Users;

    @ManyToOne(() => Users, user => user.id, { nullable: false })
    @JoinColumn({ name: 'updated_by' })
    updatedBy?: Users;
}