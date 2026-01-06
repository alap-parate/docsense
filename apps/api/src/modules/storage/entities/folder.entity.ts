import { BaseEntity } from "src/core/database/entities/base.entity";
import { Entity, Column, ManyToOne, JoinColumn, JoinTable, OneToMany } from "typeorm";
import { Users } from "src/modules/users/entities/users.entity";
import { Tenants } from "src/modules/tenants/entities/tenants.entity";

@Entity({
    name: 'folders'
})
export class Folders extends BaseEntity {
    
    @Column({
        name: 'tenant_id',
        type: 'uuid'
    })
    tenantId!: string;

    @Column({
        name: 'parent_id',
        type: 'uuid',
        nullable: true
    })
    parentId!: string | null;

    @Column({
        name: 'name',
        type: 'varchar'
    })
    name!: string;
    
    @Column({
        name: 'path',
        type: 'ltree'
    })
    path!: string;

    @Column({
        name: 'created_by',
        type: 'uuid'
    })
    createdById!: string;

    @Column({
        name: 'updated_by',
        type: 'uuid'
    })
    updatedById!: string;

    @Column({
        name: 'deleted_by',
        type: 'uuid'
    })
    deletedById!: string;
    
    @ManyToOne(() => Users, user => user.id, { nullable: false })
    @JoinColumn({ name: 'updated_by' })
    updatedBy!: Users

    @ManyToOne(() => Users, user => user.id, { nullable: false })
    @JoinColumn({ name: 'created_by' })
    createdBy!: Users

    @ManyToOne(() => Users, user => user.id, { nullable: false })
    @JoinColumn({ name: 'deleted_by' })
    deletedBy!: Users

    @ManyToOne(() => Tenants, tenant => tenant.id, { nullable: false })
    @JoinColumn({ name: 'tenant_id' })
    tenant!: Tenants;

    @ManyToOne(() => Folders)
    @JoinTable({ name: 'parent_id' })
    parent!: Folders | null;

    @OneToMany(() => Folders, folder => folder.parent)
    children!: Folders[];
}