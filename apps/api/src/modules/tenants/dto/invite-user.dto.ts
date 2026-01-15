import { IsNotEmpty, IsString, IsUUID, MaxLength } from "class-validator";
import { TenantStatus } from "../constants/tenant-status.enum";
import { Expose } from "class-transformer";
import { TenantRole } from "../constants/tenant-role.enum";

export class InviteUserDtoRequestBody {
    @IsString()
    @IsNotEmpty()
    email!: string;

    @IsUUID()
    @IsNotEmpty()
    tenantId!: string;

    @IsString()
    @IsNotEmpty()
    role!: TenantRole

}

export class InviteUserResponseDto {
    @Expose()
    tenantId!: string;

    @Expose()
    email!: string;

    @Expose()
    role!: string;
}