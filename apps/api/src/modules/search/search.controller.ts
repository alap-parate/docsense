import { Controller, Get, Query, UseGuards, HttpCode, HttpStatus } from "@nestjs/common";
import { AuthGuard } from "src/core/auth/guards/auth-guard";
import { CurrentUser } from "src/shared/decorators/current-user.decorator";
import type { AuthUser } from "src/shared/types/auth-user.type";
import { SearchService } from "./services/search.service";
import { SearchQueryDto, SearchResponseDto } from "./dto/search.dto";

@Controller({
    version: "1",
    path: "search",
})
@UseGuards(AuthGuard)
export class SearchController {
    constructor(
        private readonly searchService: SearchService
    ) {}

    @Get()
    @HttpCode(HttpStatus.OK)
    async search(
        @Query() query: SearchQueryDto,
        @CurrentUser() user: AuthUser
    ): Promise<SearchResponseDto> {
        const tenantId = user.tenantId ?? '';
        const userId = user.id ?? '';
        return this.searchService.search(query, tenantId, userId);
    }
}