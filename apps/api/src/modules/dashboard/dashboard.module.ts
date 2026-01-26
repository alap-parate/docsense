import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Files } from "src/modules/storage/entities/files.entity";
import { QueryHistory } from "src/modules/query-history/entities/query-history.entity";
import { TenantUsers } from "src/modules/tenants/entities/tenant-users.entity";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./services/dashboard.service";
import { AuthModule } from "src/core/auth/auth.module";
import { TenantsModule } from "src/modules/tenants/tenants.module";

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Files,
            QueryHistory,
            TenantUsers,
        ]),
        AuthModule,
        TenantsModule,
    ],
    controllers: [DashboardController],
    providers: [DashboardService],
    exports: [DashboardService],
})
export class DashboardModule {}
