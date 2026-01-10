import { Injectable } from "@nestjs/common";
import { UserRepository } from "src/modules/users/repositories/user.repository";

@Injectable()
export class AuthService {
    constructor(
        private readonly userRepo: UserRepository
    ) { }

    async syncUserFromSupabase(id: string, email:string, provider: string, firstName?: string, lastName?: string): Promise<any> {
        return this.userRepo.syncUser({email: email, provider: provider, fname:firstName, lname: lastName, externalUserId: id})
    }
}