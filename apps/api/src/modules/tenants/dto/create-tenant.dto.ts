import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import { TenantStatus } from "../constants/tenant-status.enum";
import { Expose } from "class-transformer";

export class CreateTenantDto {
    
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name!: string;
}

export class CreateTenantResponseDto {
    @Expose()
    id!: string;

    @Expose()
    name!: string;

}