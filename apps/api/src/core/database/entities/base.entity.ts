import {
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    Entity
} from 'typeorm';

export abstract class BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date

    @UpdateDateColumn({ 
        type: 'timestamptz',
        nullable: true
    })
    updatedAt!: Date | null

    @DeleteDateColumn({ type: 'timestamptz' })
    deletedAt?: Date | null

}