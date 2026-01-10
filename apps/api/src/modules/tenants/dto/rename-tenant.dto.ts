import { IsNotEmpty, IsString, IsUUID, MaxLength } from "class-validator";
import { TenantStatus } from "../constants/tenant-status.enum";
import { Expose } from "class-transformer";

export class TenantIdParamDto {

    @IsUUID()
    tenantId!: string;
}

export class RenameTenantDto {
    
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name!: string;
}

export class RenameTenantResponseDto {
    @Expose()
    id!: string;

    @Expose()
    name!: string;

}