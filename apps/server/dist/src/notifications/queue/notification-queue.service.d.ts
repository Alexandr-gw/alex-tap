import { OnModuleDestroy } from '@nestjs/common';
import { AppLogger } from '@/observability/app-logger.service';
import { RequestContextService } from '@/observability/request-context.service';
import { type EmailJobPayload, type SmsJobPayload } from './notification-queue.types';
export declare class NotificationQueueService implements OnModuleDestroy {
    private readonly logger;
    private readonly requestContext;
    private readonly connection;
    private readonly emailQueue;
    private readonly emailDlq;
    private readonly smsQueue;
    private readonly smsDlq;
    constructor(logger: AppLogger, requestContext: RequestContextService);
    scheduleEmailReminder(input: {
        jobId: string;
        reminderKey: string;
        companyId: string;
        notificationId: string;
        scheduledAt: Date;
    }): Promise<void>;
    cancelEmailReminder(jobId: string, reminderKey: string): Promise<void>;
    moveEmailToDlq(payload: EmailJobPayload): Promise<void>;
    moveSmsToDlq(payload: SmsJobPayload): Promise<void>;
    getConnection(): import("bullmq").ConnectionOptions;
    getHealthSnapshot(): Promise<{
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
    }>;
    onModuleDestroy(): Promise<void>;
    private buildEmailReminderQueueJobId;
}
