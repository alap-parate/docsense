import { BaseEntity } from "src/core/database/entities/base.entity";
import { Entity, Column } from "typeorm";

enum UserStatus {
    ACTIVE,
    BLOCKED
}

@Entity({
    name: 'users'
})
export class Users extends BaseEntity {

    @Column({ name: 'external_user_id' })
    externalUserId!: string;

    @Column({ name: 'email' })
    email!: string

    @Column({ 
        name: 'status',
        type: 'enum',
        enum: UserStatus,
        default: UserStatus.ACTIVE
     })
    status!: UserStatus;

}