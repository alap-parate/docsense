import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/core/auth/guards/auth-guard';

@Controller('demo')
export class DemoController {
    @Get('auth')
    @UseGuards(AuthGuard)
    demoAuth(@Req() req: any) {
        return {
            message: 'JWT verified successfully',
            user: req.user
        }
    }
}
