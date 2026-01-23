import { Body, Controller, Get, Header, HttpCode, HttpStatus, Param, Post, Query, Res, UseGuards } from "@nestjs/common";
import { StorageService } from "./services/storage.service";
import { AuthGuard } from "src/core/auth/guards/auth-guard";
import { CurrentUser } from "src/shared/decorators/current-user.decorator";
import type { AuthUser } from "src/shared/types/auth-user.type";
import {
    DeleteFilesDto,
    FileIdParamDto,
    ListFilesQueryDto,
    MoveFilesDto,
    TenantQueryDto,
    UploadRequestDto,
    ConfirmUploadDto,
} from "./dto/file.dto";

@Controller({
    version: "1",
    path: "files",
})
@UseGuards(AuthGuard)
export class FilesController {
    constructor(private readonly storageService: StorageService) {}

    @Post("upload-request")
    @HttpCode(HttpStatus.OK)
    async requestUpload(
        @CurrentUser() user: AuthUser,
        @Body() dto: UploadRequestDto
    ) {
        const tenantId = dto.tenantId ?? user.tenantId;
        return this.storageService.requestFileUpload(user.id, tenantId, dto);
    }

    @Post(":fileId/confirm-upload")
    @HttpCode(HttpStatus.OK)
    async confirmUpload(
        @CurrentUser() user: AuthUser,
        @Param() params: FileIdParamDto,
        @Body() dto: ConfirmUploadDto
    ) {
        const tenantId = dto.tenantId ?? user.tenantId;
        return this.storageService.confirmUpload(user.id, tenantId, params.fileId);
    }

    @Get()
    @HttpCode(HttpStatus.OK)
    async listFiles(
        @CurrentUser() user: AuthUser,
        @Query() query: ListFilesQueryDto
    ) {
        const tenantId = query.tenantId ?? user.tenantId;
        return this.storageService.listFiles(user.id, tenantId, query.folderId);
    }

    @Get(":fileId")
    @HttpCode(HttpStatus.OK)
    async getFileDetails(
        @CurrentUser() user: AuthUser,
        @Param() params: FileIdParamDto,
        @Query() query: TenantQueryDto
    ) {
        const tenantId = query.tenantId ?? user.tenantId;
        return this.storageService.getFileDetail(user.id, tenantId, params.fileId);
    }

    @Get(":fileId/download")
    @HttpCode(HttpStatus.OK)
    async getFileDownloadUrl(
        @CurrentUser() user: AuthUser,
        @Param() params: FileIdParamDto,
        @Query() query: TenantQueryDto
    ) {
        const tenantId = query.tenantId ?? user.tenantId;
        // Default expiration: 1 hour (3600 seconds)
        // Frontend should use this URL immediately as it expires
        const expiresIn = 3600;
        return this.storageService.getFileDownloadUrl(
            user.id,
            tenantId,
            params.fileId,
            expiresIn
        );
    }

    @Post("move")
    @HttpCode(HttpStatus.OK)
    async moveFiles(
        @CurrentUser() user: AuthUser,
        @Body() dto: MoveFilesDto
    ) {
        const tenantId = dto.tenantId ?? user.tenantId;
        return this.storageService.moveFiles(
            user.id,
            tenantId,
            dto.ids,
            dto.targetParentId ?? null
        );
    }

    @Post("delete")
    @HttpCode(HttpStatus.OK)
    async deleteFiles(
        @CurrentUser() user: AuthUser,
        @Body() dto: DeleteFilesDto
    ) {
        const tenantId = dto.tenantId ?? user.tenantId;
        return this.storageService.deleteFiles(user.id, tenantId, dto.fileIds);
    }
}
