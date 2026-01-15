import { IsNotEmpty, IsString, IsUUID, MaxLength } from "class-validator";
import { Expose } from "class-transformer";
import { TenantRole } from "../constants/tenant-role.enum";

export class RevokeInviteParamDto {
    @IsString()
    @IsNotEmpty()
    id!: string;
}

export class RevokeInviteResponseDto {
    @Expose()
    userId!: string;

    @Expose()
    tenantId!: string;

    @Expose()
    role!: TenantRole;
}