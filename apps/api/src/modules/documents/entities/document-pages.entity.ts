import { BaseEntity } from "src/core/database/entities/base.entity";
import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { Files } from "src/modules/storage/entities/files.entity";

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
    
}