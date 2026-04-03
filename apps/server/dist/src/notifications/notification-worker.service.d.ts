import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AppLogger } from '@/observability/app-logger.service';
import { RequestContextService } from '@/observability/request-context.service';
import { type EmailProvider } from './providers/email.provider';
import { TwilioSmsProvider } from './providers/twilio.provider';
import { NotificationQueueService } from './queue/notification-queue.service';
export declare class NotificationWorkerService implements OnModuleInit, OnModuleDestroy {
    private readonly prisma;
    private readonly queues;
    private readonly logger;
    private readonly requestContext;
    private readonly emailProvider;
    private readonly smsProvider;
    private emailWorker;
    private smsWorker;
    constructor(prisma: PrismaService, queues: NotificationQueueService, logger: AppLogger, requestContext: RequestContextService, emailProvider: EmailProvider, smsProvider: TwilioSmsProvider);
    onModuleInit(): void;
    onModuleDestroy(): Promise<void>;
    private attachEventLogging;
    private runObservedJob;
    private processEmail;
    private processSms;
    private updateNotificationStatus;
}
