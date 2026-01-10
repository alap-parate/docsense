import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Users } from './entities/users.entity';
import { UserRepository } from './repositories/user.repository';

@Module({
    imports: [
        TypeOrmModule.forFeature([Users])
    ],
    providers: [UserRepository],
    exports: [UserRepository]

})
export class UsersModule {}
