import { IsNotEmpty, IsString, IsUUID, MaxLength } from "class-validator";
import { Expose } from "class-transformer";
import { TenantRole } from "../constants/tenant-role.enum";

export class AcceptInviteParamDto {
    @IsString()
    @IsNotEmpty()
    token!: string;
}

export class AcceptInviteResponseDto {
    @Expose()
    userId!: string;

    @Expose()
    role!: TenantRole;
}