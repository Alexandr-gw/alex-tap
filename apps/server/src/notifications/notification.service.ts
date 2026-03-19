import { Injectable, NotFoundException } from '@nestjs/common';
import {
  JobStatus,
  NotificationChannel,
  NotificationStatus,
} from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import type { JobNotificationDto } from './notification.dto';
import { emailQueue } from './workers/email.worker';
import {
  MAX_ATTEMPTS,
  TYPE_JOB_REMINDER_1H,
  TYPE_JOB_REMINDER_24H,
} from './notification.constants';

const EMAIL_REMINDER_DEFINITIONS = [
  { key: '24h', type: TYPE_JOB_REMINDER_24H, offsetMs: 24 * 60 * 60 * 1000 },
  { key: '1h', type: TYPE_JOB_REMINDER_1H, offsetMs: 60 * 60 * 1000 },
] as const;

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async scheduleJobReminders(
    companyId: string,
    jobId: string,
  ): Promise<JobNotificationDto[]> {
    const job = (await this.prisma.job.findFirst({
      where: {
        id: jobId,
        companyId,
      },
      include: {
        company: true,
        client: true,
        worker: true,
      },
    } as any)) as any;

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    await this.cancelJobReminders(
      companyId,
      jobId,
      'Reminder schedule refreshed',
    );

    if (!this.shouldScheduleEmailReminders(job.status, job.client.email)) {
      return [];
    }

    const notifications: JobNotificationDto[] = [];
    const basePayload = {
      jobId: job.id,
      clientId: job.clientId,
      workerId: job.workerId ?? null,
      manageUrl: null as string | null,
    };
    const recipient = job.client.email?.trim().toLowerCase() ?? null;
    const now = Date.now();

    for (const reminder of EMAIL_REMINDER_DEFINITIONS) {
      const scheduledAt = new Date(job.startAt.getTime() - reminder.offsetMs);
      if (scheduledAt.getTime() <= now) {
        continue;
      }

      const notification = (await this.prisma.notification.create({
        data: {
          companyId,
          type: reminder.type,
          channel: NotificationChannel.EMAIL,
          status: NotificationStatus.QUEUED,
          targetType: 'JOB',
          targetId: job.id,
          payload: basePayload,
          recipient,
          providerMessageId: null,
          scheduledAt,
          error: null,
        },
      } as any)) as any;

      try {
        await emailQueue.add(
          'send',
          { companyId, notificationId: notification.id },
          {
            jobId: this.buildEmailReminderQueueJobId(job.id, reminder.key),
            delay: Math.max(0, scheduledAt.getTime() - now),
            attempts: MAX_ATTEMPTS,
            backoff: {
              type: 'exponential',
              delay: 5_000,
            },
            removeOnComplete: true,
            removeOnFail: false,
          },
        );

        notifications.push(this.mapNotification(notification));
      } catch (error: any) {
        const failed = (await this.prisma.notification.update({
          where: { id: notification.id },
          data: {
            status: 'FAILED' as any,
            error:
              error?.message?.slice(0, 500) ?? 'Failed to enqueue reminder',
          },
        } as any)) as any;

        notifications.push(this.mapNotification(failed));
      }
    }

    return notifications;
  }

  async cancelJobReminders(
    companyId: string,
    jobId: string,
    reason = 'Reminder canceled',
  ) {
    await Promise.all(
      EMAIL_REMINDER_DEFINITIONS.map((reminder) =>
        emailQueue
          .remove(this.buildEmailReminderQueueJobId(jobId, reminder.key))
          .catch(() => undefined),
      ),
    );

    await this.prisma.notification.updateMany({
      where: {
        companyId,
        targetType: 'JOB',
        targetId: jobId,
        channel: NotificationChannel.EMAIL,
        type: {
          in: EMAIL_REMINDER_DEFINITIONS.map((reminder) => reminder.type),
        },
        status: NotificationStatus.QUEUED,
      },
      data: {
        status: 'CANCELED' as any,
        error: reason,
        providerMessageId: null,
      },
    } as any);
  }

  async rescheduleJobReminders(
    companyId: string,
    jobId: string,
  ): Promise<JobNotificationDto[]> {
    return this.scheduleJobReminders(companyId, jobId);
  }

  async listJobNotifications(
    companyId: string,
    jobId: string,
  ): Promise<JobNotificationDto[]> {
    const notifications = (await this.prisma.notification.findMany({
      where: {
        companyId,
        targetType: 'JOB',
        targetId: jobId,
        channel: NotificationChannel.EMAIL,
        type: {
          in: EMAIL_REMINDER_DEFINITIONS.map((reminder) => reminder.type),
        },
      },
      orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'asc' }],
    } as any)) as any[];

    return notifications.map((notification) =>
      this.mapNotification(notification),
    );
  }

  private shouldScheduleEmailReminders(
    status: JobStatus,
    clientEmail: string | null,
  ) {
    return (
      process.env.NOTIFICATIONS_EMAIL_ENABLED === 'true' &&
      status === JobStatus.SCHEDULED &&
      Boolean(clientEmail?.trim())
    );
  }

  private buildEmailReminderQueueJobId(
    jobId: string,
    reminderKey: (typeof EMAIL_REMINDER_DEFINITIONS)[number]['key'],
  ) {
    return `job:${jobId}:email:${reminderKey}`;
  }

  private mapNotification(notification: {
    id: string;
    type: string;
    channel: string;
    status: string;
    scheduledAt: Date | null;
    sentAt: Date | null;
    recipient: string | null;
    providerMessageId: string | null;
    error: string | null;
  }): JobNotificationDto {
    return {
      id: notification.id,
      type: notification.type,
      channel: notification.channel,
      status: notification.status,
      scheduledAt: notification.scheduledAt?.toISOString() ?? null,
      sentAt: notification.sentAt?.toISOString() ?? null,
      recipient: notification.recipient,
      providerMessageId: notification.providerMessageId,
      errorMessage: notification.error,
    };
  }
}
