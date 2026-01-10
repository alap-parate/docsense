import { IsNotEmpty, IsString, } from "class-validator";
import { TenantStatus } from "../constants/tenant-status.enum";
import { Expose } from "class-transformer";
import { TenantRole } from "../constants/tenant-role.enum";
import { PaginationQueryDto } from "src/shared/dto/pagination-query.dto";

export class TenantListUserRequestDto extends PaginationQueryDto {
    @IsString()
    @IsNotEmpty()
    workspaceId!: string
}

export class TenantListUserResponseDto {
    @Expose()
    userId!: string;

    @Expose()
    name!: string;

    @Expose()
    role!: TenantRole

    @Expose()
    joinedDate!: Date

}