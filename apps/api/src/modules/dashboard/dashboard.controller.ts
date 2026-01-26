import { Controller, Get, HttpCode, HttpStatus, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "src/core/auth/guards/auth-guard";
import { TenantGuard } from "src/modules/tenants/guards/tenant-guard";
import { CurrentUser } from "src/shared/decorators/current-user.decorator";
import type { AuthUser } from "src/shared/types/auth-user.type";
import { DashboardService } from "./services/dashboard.service";
import { DashboardQueryDto } from "./dto/dashboard.dto";

@Controller({
    version: "1",
    path: "dashboard",
})
@UseGuards(AuthGuard, TenantGuard)
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) {}

    @Get()
    @HttpCode(HttpStatus.OK)
    async getDashboard(
        @CurrentUser() user: AuthUser,
        @Query() query: DashboardQueryDto
    ) {
        const tenantId = query.tenantId ?? user.tenantId;
        return this.dashboardService.getDashboard(user.id, tenantId);
    }
}
