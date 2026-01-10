import { BaseEntity } from "src/core/database/entities/base.entity";
import { Entity, Column, JoinColumn, ManyToOne, Unique } from "typeorm";
import { Users } from "src/modules/users/entities/users.entity";
import { Tenants } from "./tenants.entity";
import { TenantRole } from "../constants/tenant-role.enum";
import { MembershipStatus } from "../constants/membership-status.enum";

@Unique(['tenantId', 'userId'])
@Entity({
    name: 'tenant_users'
})
export class TenantUsers extends BaseEntity {

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
        name: 'role',
        type: 'enum',
        enum: TenantRole,
        default: TenantRole.MEMBER 
    })
    role!: TenantRole;

    @Column({ 
        name: 'status',
        type: 'enum',
        enum: MembershipStatus,
        default: MembershipStatus.INVITED 
    })
    status!: MembershipStatus;

    @Column({ 
        name: 'joined_at',
        type: 'timestamp with time zone',
        default: null
    })
    joinedAt?: Date | null; 

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

    @Column({
        name: 'deleted_by',
        type: 'uuid',
        nullable: true
    })
    deletedById?: string | null;

    @ManyToOne(() => Users, user => user.id, { nullable: false })
    @JoinColumn({ name: 'created_by' })
    createdBy!: Users;

    @ManyToOne(() => Users, user => user.id, { nullable: false })
    @JoinColumn({ name: 'updated_by' })
    updatedBy?: Users;

    @ManyToOne(() => Users, user => user.id, { nullable: false })
    @JoinColumn({ name: 'deleted_by' })
    deletedBy?: Users;

    @ManyToOne(() => Tenants, tenant => tenant.id, { nullable: false })
    @JoinColumn({ name: 'tenant_id' })
    tenant!: Tenants;

    @ManyToOne(() => Users, user => user.id, { nullable: false })
    @JoinColumn({ name: 'user_id' })
    user!: Users;
}