import { PrismaService } from '@/prisma/prisma.service';
import { NotificationQueueService } from '@/notifications/queue/notification-queue.service';
export declare class HealthController {
    private readonly prisma;
    private readonly queues;
    constructor(prisma: PrismaService, queues: NotificationQueueService);
    healthz(): Promise<{
        ok: boolean;
        db: string;
        queues: {
            redis: "up";
            email: {
                [index: string]: number;
            };
            emailDlq: {
                [index: string]: number;
            };
            sms: {
                [index: string]: number;
            };
            smsDlq: {
                [index: string]: number;
            };
            error?: undefined;
        } | {
            redis: "down";
            error: string;
            email: null;
            emailDlq: null;
            sms: null;
            smsDlq: null;
        };
    }>;
    queueHealth(): Promise<{
        ok: boolean;
        queues: {
            redis: "up";
            email: {
                [index: string]: number;
            };
            emailDlq: {
                [index: string]: number;
            };
            sms: {
                [index: string]: number;
            };
            smsDlq: {
                [index: string]: number;
            };
            error?: undefined;
        };
    }>;
}
