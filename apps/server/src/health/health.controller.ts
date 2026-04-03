import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import {SkipThrottle} from '@nestjs/throttler';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationQueueService } from '@/notifications/queue/notification-queue.service';

@Controller('healthz')
@SkipThrottle({default: true})
export class HealthController {
    constructor(
        private readonly prisma: PrismaService,
        private readonly queues: NotificationQueueService,
    ) {}

    @Get()
    async healthz() {
        try {
            await this.prisma.$queryRaw`SELECT 1`;
            const queues = await this.queues.getHealthSnapshot();
            return { ok: queues.redis === 'up', db: 'up', queues };
        } catch {
            throw new HttpException({ ok: false, db: 'down' }, HttpStatus.SERVICE_UNAVAILABLE);
        }
    }

    @Get('queues')
    async queueHealth() {
        const queues = await this.queues.getHealthSnapshot();

        if (queues.redis !== 'up') {
            throw new HttpException({ ok: false, queues }, HttpStatus.SERVICE_UNAVAILABLE);
        }

        return { ok: true, queues };
    }
}
