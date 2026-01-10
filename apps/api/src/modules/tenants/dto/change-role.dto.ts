import { IsNotEmpty, IsString, IsUUID, MaxLength } from "class-validator";
import { TenantStatus } from "../constants/tenant-status.enum";
import { Expose } from "class-transformer";
import { TenantRole } from "../constants/tenant-role.enum";

export class ChangeRoleUserParamDto {

    @IsUUID()
    tenantId!: string;

    @IsUUID()
    userId!: string;
}

export class ChangeRoleUserBodyDto{
    @IsString()
    @IsNotEmpty()
    role!: TenantRole;
}

export class ChangeRoleUserResponseDto {
    @Expose()
    userId!: string;

    @Expose()
    role!: TenantRole;

}