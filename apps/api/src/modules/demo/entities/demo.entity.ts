import { BaseEntity } from "src/core/database/entities/base.entity";
import { Column, Entity } from "typeorm";

@Entity()
export class Demo extends BaseEntity {
    @Column({type: 'varchar'})
    name!: string
}