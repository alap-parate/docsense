import { Controller, Get, HttpStatus, Post, UseGuards, HttpCode, Param, Query, Patch } from '@nestjs/common';
import { TenantService } from './services/tenants.service';
import { CreateTenantDto, CreateTenantResponseDto } from './dto/create-tenant.dto';
import { CurrentUser } from 'src/shared/decorators/current-user.decorator';
import { Body } from '@nestjs/common';
import { AuthGuard } from 'src/core/auth/guards/auth-guard';
import { plainToInstance } from 'class-transformer';
import { TenantListItemResponseDto } from './dto/list-tenant.dto';
import type { AuthUser } from 'src/shared/types/auth-user.type';
import { PaginationQueryDto } from 'src/shared/dto/pagination-query.dto';
import { TenantListUserRequestDto, TenantListUserResponseDto } from './dto/list-user.dto';
import { RenameTenantDto, TenantIdParamDto } from './dto/rename-tenant.dto';
import { RemoveTenantUserParamDto, RemoveTenantUserResponseDto } from './dto/remove-user.dto';
import { ChangeRoleUserParamDto, ChangeRoleUserResponseDto, ChangeRoleUserBodyDto } from './dto/change-role.dto';

@Controller({
    version: '1',
    path: 'workspace'
})
@UseGuards(AuthGuard)
export class TenantsController {

    constructor(
        private readonly tenantService: TenantService,
    ) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async createTenant(
        @Body() dto: CreateTenantDto,
        @CurrentUser() user: AuthUser,
    ): Promise<CreateTenantResponseDto> {
        const tenant = this.tenantService.createTenant({
                tenantName: dto.name,
                createdByUserId: user.id,
            }
        )
        return plainToInstance(CreateTenantResponseDto, tenant, {
            excludeExtraneousValues: true
        })
    }

    @Get()
    @HttpCode(HttpStatus.OK)
    async listTenants(
        @CurrentUser() user: AuthUser,
        @Query() query:PaginationQueryDto
    ) {
        const result = await this.tenantService.listTenants(
            user.id, 
            query.page,
            query.limit, 
            query.offset
        );

        const tenants = plainToInstance(TenantListItemResponseDto, result.workspace, {
                            excludeExtraneousValues: true
                        });

        return {
            workspaces: tenants,
            pagination: result.pagination
        }
    }

    @Get('/users')
    @HttpCode(HttpStatus.OK)
    async listUsers(
        @CurrentUser() user: AuthUser,
        @Query() query: TenantListUserRequestDto
    ) {
        const result = await this.tenantService.listUsers(
            query.workspaceId,
            query.page,
            query.limit,
            query.offset
        )

        const users = plainToInstance(TenantListUserResponseDto, result.users, {
            excludeExtraneousValues: true
        })

        return {
            users: users,
            pagination: result.pagination
        }
    }

    @Patch(':tenantId')
    @HttpCode(HttpStatus.OK)
    async renameTenant(
        @Param() params: TenantIdParamDto,
        @CurrentUser() user: AuthUser,
        @Body() dto: RenameTenantDto
    ) {
        return this.tenantService.renameTenant(
            params.tenantId,
            user.id,
            dto.name
        )
    }

    @Post(':tenantId/user/:userId/remove')
    @HttpCode(HttpStatus.OK)
    async removeUser(
        @Param() params: RemoveTenantUserParamDto,
        @CurrentUser() user: AuthUser
    ) {
        const data = await this.tenantService.removeUser(
            params.tenantId,
            user.id,
            params.userId,
        )
        const response = plainToInstance(RemoveTenantUserResponseDto, data, {
            excludeExtraneousValues: true
        })
        return response;

    }

    @Post(':tenantId/user/:userId/role')
    @HttpCode(HttpStatus.OK)
    async changeRole(
        @Param() params: ChangeRoleUserParamDto,
        @CurrentUser() user: AuthUser,
        @Body() dto: ChangeRoleUserBodyDto
    ) {
        const data = await this.tenantService.changeUsersRole(
            params.tenantId,
            user.id,
            params.userId,
            dto.role
        )

        const response = plainToInstance(ChangeRoleUserResponseDto, data, {
            excludeExtraneousValues: true
        })
        return response
    }

}
