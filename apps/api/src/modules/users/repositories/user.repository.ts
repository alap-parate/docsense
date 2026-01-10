import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Users } from "../entities/users.entity";
import { Repository } from "typeorm";
import { UserStatus } from "../constants/user-status.enum";
import { UpdateResult } from "typeorm/browser";

@Injectable()
export class UserRepository {

    constructor(
        @InjectRepository(Users)
        private readonly userRepo: Repository<Users>
    ) { }

    async findByEmail(email: string): Promise<Users | null> {
        return this.userRepo.findOne({
            where: {
                email: email,
            },
            select: [
                'id',
                'email',
                'status',
            ]
        })
    }

    async findById(id: string): Promise<Users | null> {
        return this.userRepo.findOne({
            where: { id },
            select: [
                'id',
                'email',
                'status'
            ]
        })
    }

    async findByExternalId(id: string): Promise<Users | null> {
        return this.userRepo.findOne({
            where: { externalUserId: id },
            select: [
                'id',
                'email',
                'status'
            ]
        })
    };

    async syncUser(data: {
        externalUserId: string,
        email: string,
        provider: string
        fname?: string,
        lname?: string,
    }): Promise<Users> {
        const result = await this.userRepo
            .createQueryBuilder()
            .insert()
            .into(Users)
            .values({
                externalUserId: data.externalUserId,
                email: data.email,
                fname: data.fname,
                lname: data.lname,
                provider: data.provider
            })
            .orUpdate({
                conflict_target: ['external_user_id'],
                overwrite: ['email','fname','lname','updatedAt']
            })
            .returning(['id','external_user_id','email','fname','lname','status'])
            .execute()
        return result.raw[0]
    };

    async blockUserById(id: string): Promise<boolean> {
        const result = await this.userRepo.update(
            { id }, {
            status: UserStatus.BLOCKED
        })
        return (result.affected ?? 0) > 0;
    }

}