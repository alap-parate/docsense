import { BaseEntity } from "src/core/database/entities/base.entity";
import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { Files } from "src/modules/storage/entities/files.entity";
import { Tenants } from "src/modules/tenants/entities/tenants.entity";

@Entity({
    name: 'document_pages'
})
export class DocumentPages extends BaseEntity {
    
    @Column({
        name: 'file_id',
        type: 'uuid'
    })
    fileId!: string;

    @Column({
        name: 'tenant_id',
        type: 'uuid'
    })
    tenantId!: string;

    @Column({
        name: 'page_number',
        type: 'int'
    })
    pageNumber!: number;

    @Column({
        name: 'text_content',
        type: 'text'
    })
    textContent!: string;
    
    @Column({
        name: 'checksum',
        type: 'varchar'
    })
    checksum!: string;

    @ManyToOne(() => Files, file => file.id, { nullable: false })
    @JoinColumn({ name: 'file_id' })
    file!: Files;

    @ManyToOne(() => Tenants, tenant => tenant.id, { nullable: false })
    @JoinColumn({ name: 'tenant_id' })
    tenant!: Tenants;
    
}