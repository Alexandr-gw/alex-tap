import { PrismaService } from '@/prisma/prisma.service';
import type { ClientLastCommunicationDto, JobNotificationDto, JobNotificationsSummaryDto, SendJobConfirmationResponseDto } from './notification.dto';
import { type EmailProvider } from './providers/email.provider';
import { NotificationQueueService } from './queue/notification-queue.service';
export declare class NotificationService {
    private readonly prisma;
    private readonly queues;
    private readonly emailProvider;
    constructor(prisma: PrismaService, queues: NotificationQueueService, emailProvider: EmailProvider);
    scheduleJobReminders(companyId: string, jobId: string): Promise<JobNotificationDto[]>;
    cancelJobReminders(companyId: string, jobId: string, reason?: string): Promise<void>;
    rescheduleJobReminders(companyId: string, jobId: string): Promise<JobNotificationDto[]>;
    listJobNotifications(companyId: string, jobId: string): Promise<JobNotificationDto[]>;
    getJobNotificationsSummary(companyId: string, jobId: string): Promise<JobNotificationsSummaryDto>;
    sendJobConfirmation(companyId: string, jobId: string): Promise<SendJobConfirmationResponseDto>;
    getLatestClientCommunication(companyId: string, clientId: string): Promise<ClientLastCommunicationDto | null>;
    private shouldScheduleEmailReminders;
    private findJobForNotifications;
    private getJobCommunicationBlockedReason;
    private buildConfirmationSummary;
    private buildReminderSummary;
    private getReminderNotApplicableReason;
    private mapReminderStatus;
    private buildJobConfirmationEmail;
    private getJobManageUrl;
    private mapClientLastCommunication;
    private mapNotification;
}
