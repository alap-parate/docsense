import { Controller } from '@nestjs/common';
import { Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
    @Get()
    ok() {
        return {status: 'ok'}
    }
}
