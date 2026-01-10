import { BaseEntity } from "src/core/database/entities/base.entity";
import { Entity, Column, Unique } from "typeorm";
import { UserStatus } from "../constants/user-status.enum";

@Unique(['externalUserId'])
@Entity({
    name: 'users'
})
export class Users extends BaseEntity {

    @Column({ 
        name: 'external_user_id',
        unique: true 
    })
    externalUserId!: string;

    @Column({ 
        name: 'email',
    })
    email!: string;

    @Column({ 
        name: 'fname',
        default: null,
        nullable: true
    })
    fname?: string;

    @Column({ 
        name: 'lname',
        default: null,
        nullable: true
    })
    lname?: string;

    @Column({ 
        name: 'status',
        type: 'enum',
        enum: UserStatus,
        default: UserStatus.ACTIVE
     })
    status!: UserStatus;

    @Column({
        name: 'provider',
        default: 'email'
    })
    provider!: string;

}