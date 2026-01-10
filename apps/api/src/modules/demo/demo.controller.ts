import { Controller, Get, Injectable, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/core/auth/guards/auth-guard';

@Controller('demo')
@UseGuards(AuthGuard)
export class DemoController {
    @Get("/")
    async demo() {
        return "ok"
    }
}
