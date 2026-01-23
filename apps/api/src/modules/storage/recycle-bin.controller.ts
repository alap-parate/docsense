import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from "@nestjs/common";
import { StorageService } from "./services/storage.service";
import { AuthGuard } from "src/core/auth/guards/auth-guard";
import { TenantGuard } from "src/modules/tenants/guards/tenant-guard";
import { CurrentUser } from "src/shared/decorators/current-user.decorator";
import type { AuthUser } from "src/shared/types/auth-user.type";
import { RecycleBinPermanentDeleteDto, RecycleBinQueryDto, RecycleBinRestoreDto } from "./dto/recycle-bin.dto";

@Controller({
    version: "1",
    path: "recycle-bin",
})
@UseGuards(AuthGuard, TenantGuard)
export class RecycleBinController {
    constructor(private readonly storageService: StorageService) {}

    @Get()
    @HttpCode(HttpStatus.OK)
    async listRecycleBin(
        @CurrentUser() user: AuthUser,
        @Query() query: RecycleBinQueryDto
    ) {
        const tenantId = query.tenantId ?? user.tenantId;
        return this.storageService.listRecycleBin(
            user.id,
            tenantId,
            query.page,
            query.limit,
            query.offset
        );
    }

    @Post("restore")
    @HttpCode(HttpStatus.OK)
    async restore(
        @CurrentUser() user: AuthUser,
        @Body() dto: RecycleBinRestoreDto
    ) {
        const tenantId = dto.tenantId ?? user.tenantId;
        return this.storageService.restoreRecycleBin(user.id, tenantId, dto.ids);
    }

    @Delete("permanent")
    @HttpCode(HttpStatus.OK)
    async permanentDelete(
        @CurrentUser() user: AuthUser,
        @Body() dto: RecycleBinPermanentDeleteDto
    ) {
        const tenantId = dto.tenantId ?? user.tenantId;
        return this.storageService.permanentDeleteRecycleBin(user.id, tenantId, dto.ids);
    }
}
