import { PrismaService } from '@/prisma/prisma.service';
import type { JobNotificationDto } from './notification.dto';
export declare class NotificationService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    scheduleJobReminders(companyId: string, jobId: string): Promise<JobNotificationDto[]>;
    cancelJobReminders(companyId: string, jobId: string, reason?: string): Promise<void>;
    rescheduleJobReminders(companyId: string, jobId: string): Promise<JobNotificationDto[]>;
    listJobNotifications(companyId: string, jobId: string): Promise<JobNotificationDto[]>;
    private shouldScheduleEmailReminders;
    private buildEmailReminderQueueJobId;
    private mapNotification;
}
