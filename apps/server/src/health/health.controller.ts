import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Controller('healthz')
export class HealthController {
    constructor(private readonly prisma: PrismaService) {}

    @Get()
    async healthz() {
        try {
            await this.prisma.$queryRaw`SELECT 1`;
            return { ok: true, db: 'up' };
        } catch (e) {
            throw new HttpException({ ok: false, db: 'down' }, HttpStatus.SERVICE_UNAVAILABLE);
        }
    }
}
