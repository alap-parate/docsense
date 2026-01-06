import { BaseEntity } from "src/core/database/entities/base.entity";
import { Entity, Column, JoinColumn, ManyToOne } from "typeorm";
import { Users } from "src/modules/users/entities/users.entity";

export enum TenantStatus {
    ACTIVE = 'ACTIVE',
    SUSPENDED = 'SUSPENDED'
}

@Entity({
    name: 'tenants'
})
export class Tenants extends BaseEntity {
    
    @Column({ name: 'name' })
    name!: string;

    @Column({ 
        name: 'status',
        type: 'enum',
        enum: TenantStatus,
        default: TenantStatus.ACTIVE 
    })
    status!: TenantStatus;

    @Column({
        name: 'created_by',
        type: 'uuid',
        nullable: false
    })
    createdById!: string;

    @ManyToOne(() => Users, Users => Users.id, { nullable: false })
    @JoinColumn({ name: 'created_by' })
    createdBy!: Users;
}