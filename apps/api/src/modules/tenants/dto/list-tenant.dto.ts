import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import { TenantStatus } from "../constants/tenant-status.enum";
import { Expose } from "class-transformer";

export class TenantListItemResponseDto {
    @Expose()
    id!: string;

    @Expose()
    name!: string;

}