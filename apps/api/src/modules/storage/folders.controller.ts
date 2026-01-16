import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { StorageService } from "./services/storage.service";
import { AuthGuard } from "src/core/auth/guards/auth-guard";
import { CurrentUser } from "src/shared/decorators/current-user.decorator";
import type { AuthUser } from "src/shared/types/auth-user.type";
import {
    CreateFolderDto,
    DeleteFoldersDto,
    FolderIdParamDto,
    ListFolderQueryDto,
    MoveFoldersDto,
    RenameFolderDto,
} from "./dto/folder.dto";

@Controller({
    version: "1",
    path: "folders",
})
@UseGuards(AuthGuard)
export class FoldersController {
    constructor(private readonly storageService: StorageService) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async createFolder(
        @CurrentUser() user: AuthUser,
        @Body() dto: CreateFolderDto
    ) {
        const tenantId = dto.tenantId ?? user.tenantId;
        return this.storageService.createFolder(
            user.id,
            tenantId,
            dto.name,
            dto.parentId ?? null
        );
    }

    @Get()
    @HttpCode(HttpStatus.OK)
    async listFolders(
        @CurrentUser() user: AuthUser,
        @Query() query: ListFolderQueryDto
    ) {
        const tenantId = query.tenantId ?? user.tenantId;
        return this.storageService.listFolders(
            user.id,
            tenantId,
            query.parentId ?? null
        );
    }

    @Get(":folderId")
    @HttpCode(HttpStatus.OK)
    async getFolderDetails(
        @CurrentUser() user: AuthUser,
        @Param() params: FolderIdParamDto,
        @Query() query: ListFolderQueryDto
    ) {
        const tenantId = query.tenantId ?? user.tenantId;
        return this.storageService.getFolderDetails(
            user.id,
            tenantId,
            params.folderId
        );
    }

    @Patch(":folderId")
    @HttpCode(HttpStatus.OK)
    async renameFolder(
        @CurrentUser() user: AuthUser,
        @Param() params: FolderIdParamDto,
        @Body() dto: RenameFolderDto,
        @Query() query: ListFolderQueryDto
    ) {
        const tenantId = query.tenantId ?? user.tenantId;
        return this.storageService.renameFolder(
            user.id,
            tenantId,
            params.folderId,
            dto.name
        );
    }

    @Post("move")
    @HttpCode(HttpStatus.OK)
    async moveFolders(
        @CurrentUser() user: AuthUser,
        @Body() dto: MoveFoldersDto
    ) {
        const tenantId = dto.tenantId ?? user.tenantId;
        return this.storageService.moveFolders(
            user.id,
            tenantId,
            dto.folderIds,
            dto.targetParentId ?? null
        );
    }

    @Post("delete")
    @HttpCode(HttpStatus.OK)
    async deleteFolders(
        @CurrentUser() user: AuthUser,
        @Body() dto: DeleteFoldersDto
    ) {
        const tenantId = dto.tenantId ?? user.tenantId;
        return this.storageService.deleteFolders(
            user.id,
            tenantId,
            dto.folderIds
        );
    }
}
