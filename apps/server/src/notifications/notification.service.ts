import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  JobStatus,
  NotificationChannel,
  NotificationStatus,
  NotificationTargetType,
} from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import type {
  ClientLastCommunicationDto,
  ConfirmationSummaryDto,
  JobNotificationDto,
  JobNotificationsSummaryDto,
  ReminderSummaryDto,
  ReminderType,
  SendJobConfirmationResponseDto,
} from './notification.dto';
import {
  EMAIL_PROVIDER,
  type EmailProvider,
} from './providers/email.provider';
import { NotificationQueueService } from './queue/notification-queue.service';
import {
  TYPE_JOB_CONFIRMATION,
  TYPE_JOB_REMINDER_1H,
  TYPE_JOB_REMINDER_24H,
} from './notification.constants';
import { jobConfirmation } from './templates/jobConfirmation';
import { buildBookingAccessUrl, createBookingAccessToken, getBookingAccessExpiry } from '@/public-booking/public-booking.utils';

const EMAIL_REMINDER_DEFINITIONS = [
  {
    key: '24h',
    type: TYPE_JOB_REMINDER_24H,
    apiType: 'REMINDER_24H' as const,
    label: '24h reminder',
    offsetMs: 24 * 60 * 60 * 1000,
  },
  {
    key: '1h',
    type: TYPE_JOB_REMINDER_1H,
    apiType: 'REMINDER_1H' as const,
    label: '1h reminder',
    offsetMs: 60 * 60 * 1000,
  },
] as const;

const JOB_EMAIL_NOTIFICATION_TYPES = [
  TYPE_JOB_CONFIRMATION,
  ...EMAIL_REMINDER_DEFINITIONS.map((reminder) => reminder.type),
] as const;

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queues: NotificationQueueService,
    @Inject(EMAIL_PROVIDER)
    private readonly emailProvider: EmailProvider,
  ) {}

  async scheduleJobReminders(
    companyId: string,
    jobId: string,
  ): Promise<JobNotificationDto[]> {
    const job = await this.findJobForNotifications(companyId, jobId);

    await this.cancelJobReminders(
      companyId,
      jobId,
      'Reminder schedule refreshed',
    );

    if (!this.shouldScheduleEmailReminders(job.status, job.client.email)) {
      return [];
    }

    const notifications: JobNotificationDto[] = [];
    const manageUrl = await this.getJobManageUrl(companyId, job.id);
    const basePayload = {
      jobId: job.id,
      clientId: job.clientId,
      workerId: job.workerId ?? null,
      manageUrl,
    };
    const recipient = job.client.email?.trim().toLowerCase() ?? null;
    const now = Date.now();

    for (const reminder of EMAIL_REMINDER_DEFINITIONS) {
      const scheduledAt = new Date(job.startAt.getTime() - reminder.offsetMs);
      if (scheduledAt.getTime() <= now) {
        continue;
      }

      const notification = await this.prisma.notification.create({
        data: {
          companyId,
          type: reminder.type,
          channel: NotificationChannel.EMAIL,
          status: NotificationStatus.QUEUED,
          targetType: NotificationTargetType.JOB,
          targetId: job.id,
          payload: basePayload as any,
          recipient,
          providerMessageId: null,
          scheduledAt,
          error: null,
        },
      });

      try {
        await this.queues.scheduleEmailReminder({
          jobId: job.id,
          reminderKey: reminder.key,
          companyId,
          notificationId: notification.id,
          scheduledAt,
        });

        notifications.push(this.mapNotification(notification));
      } catch (error: any) {
        const failed = await this.prisma.notification.update({
          where: { id: notification.id },
          data: {
            status: NotificationStatus.FAILED,
            error:
              error?.message?.slice(0, 500) ?? 'Failed to enqueue reminder',
          },
        });

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
        this.queues.cancelEmailReminder(jobId, reminder.key),
      ),
    );

    await this.prisma.notification.updateMany({
      where: {
        companyId,
        targetType: NotificationTargetType.JOB,
        targetId: jobId,
        channel: NotificationChannel.EMAIL,
        type: {
          in: EMAIL_REMINDER_DEFINITIONS.map((reminder) => reminder.type),
        },
        status: NotificationStatus.QUEUED,
      },
      data: {
        status: NotificationStatus.CANCELED,
        error: reason,
        providerMessageId: null,
      },
    });
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
    const notifications = await this.prisma.notification.findMany({
      where: {
        companyId,
        targetType: NotificationTargetType.JOB,
        targetId: jobId,
        channel: NotificationChannel.EMAIL,
        type: {
          in: EMAIL_REMINDER_DEFINITIONS.map((reminder) => reminder.type),
        },
      },
      orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'asc' }],
    });

    return notifications.map((notification) =>
      this.mapNotification(notification),
    );
  }

  async getJobNotificationsSummary(
    companyId: string,
    jobId: string,
  ): Promise<JobNotificationsSummaryDto> {
    const [job, notifications] = await Promise.all([
      this.findJobForNotifications(companyId, jobId),
      this.prisma.notification.findMany({
        where: {
          companyId,
          targetType: NotificationTargetType.JOB,
          targetId: jobId,
          channel: NotificationChannel.EMAIL,
          type: { in: [...JOB_EMAIL_NOTIFICATION_TYPES] },
        },
        orderBy: [{ createdAt: 'asc' }],
      }),
    ]);

    const clientEmail = job.client.email?.trim().toLowerCase() ?? null;
    const confirmationNotifications = notifications.filter(
      (notification) => notification.type === TYPE_JOB_CONFIRMATION,
    );

    return {
      jobId: job.id,
      clientEmail,
      blockedReason: this.getJobCommunicationBlockedReason(job),
      confirmation: this.buildConfirmationSummary(confirmationNotifications),
      reminders: EMAIL_REMINDER_DEFINITIONS.map((reminder) =>
        this.buildReminderSummary(
          reminder.apiType,
          reminder.offsetMs,
          job,
          notifications.filter((notification) => notification.type === reminder.type),
        ),
      ),
    };
  }

  async sendJobConfirmation(
    companyId: string,
    jobId: string,
  ): Promise<SendJobConfirmationResponseDto> {
    const job = await this.findJobForNotifications(companyId, jobId);
    const blockedReason = this.getJobCommunicationBlockedReason(job);

    if (blockedReason) {
      throw new BadRequestException(blockedReason);
    }

    const recipient = job.client.email!.trim().toLowerCase();
    const manageUrl = await this.getJobManageUrl(companyId, job.id);
    const notification = await this.prisma.notification.create({
      data: {
        companyId,
        type: TYPE_JOB_CONFIRMATION,
        channel: NotificationChannel.EMAIL,
        status: NotificationStatus.QUEUED,
        targetType: NotificationTargetType.JOB,
        targetId: job.id,
        payload: {
          jobId: job.id,
          clientId: job.clientId,
          workerId: job.workerId ?? null,
          manageUrl,
        } as any,
        recipient,
        providerMessageId: null,
        scheduledAt: null,
        error: null,
      },
    });

    const from = process.env.NOTIFY_FROM_EMAIL?.trim();
    if (!from) {
      const failed = await this.prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: NotificationStatus.FAILED,
          error: 'NOTIFY_FROM_EMAIL not set',
        },
      });

      return {
        success: false,
        message: 'Unable to send confirmation email.',
        confirmation: this.buildConfirmationSummary([failed]),
      };
    }

    const result = await this.emailProvider.sendEmail({
      to: recipient,
      from,
      ...this.buildJobConfirmationEmail(job),
    });

    const updated = await this.prisma.notification.update({
      where: { id: notification.id },
      data: result.ok
        ? {
            status: NotificationStatus.SENT,
            sentAt: new Date(),
            recipient,
            providerMessageId: result.messageId ?? null,
            error: null,
          }
        : {
            status: NotificationStatus.FAILED,
            error: result.errorMessage ?? 'Unable to send confirmation email',
          },
    });

    return {
      success: updated.status === NotificationStatus.SENT,
      message:
        updated.status === NotificationStatus.SENT
          ? 'Confirmation email sent.'
          : 'Unable to send confirmation email.',
      confirmation: this.buildConfirmationSummary([updated]),
    };
  }

  async getLatestClientCommunication(
    companyId: string,
    clientId: string,
  ): Promise<ClientLastCommunicationDto | null> {
    const jobs = await this.prisma.job.findMany({
      where: {
        companyId,
        clientId,
        deletedAt: null,
      },
      select: { id: true },
    });

    const jobIds = jobs.map((job) => job.id);
    if (!jobIds.length) {
      return null;
    }

    const notification = await this.prisma.notification.findFirst({
      where: {
        companyId,
        targetType: NotificationTargetType.JOB,
        targetId: { in: jobIds },
        channel: NotificationChannel.EMAIL,
        status: NotificationStatus.SENT,
        type: { in: [...JOB_EMAIL_NOTIFICATION_TYPES] },
      },
      orderBy: [{ sentAt: 'desc' }, { createdAt: 'desc' }],
    });

    return notification ? this.mapClientLastCommunication(notification) : null;
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

  private async findJobForNotifications(companyId: string, jobId: string) {
    const job = await this.prisma.job.findFirst({
      where: {
        id: jobId,
        companyId,
      },
      include: {
        company: true,
        client: true,
        worker: true,
        bookingAccessLink: {
          select: { token: true },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return job;
  }

  private getJobCommunicationBlockedReason(job: {
    status: JobStatus;
    client: { email: string | null };
  }) {
    if (process.env.NOTIFICATIONS_EMAIL_ENABLED !== 'true') {
      return 'Email notifications are disabled.';
    }

    if (!job.client.email?.trim()) {
      return 'No client email available. Email notifications are unavailable.';
    }

    if (job.status === JobStatus.CANCELED) {
      return 'Notifications are unavailable for canceled jobs.';
    }

    if (job.status === JobStatus.DONE) {
      return 'Notifications are unavailable for completed jobs.';
    }

    return null;
  }

  private buildConfirmationSummary(
    notifications: Array<{
      status: NotificationStatus;
      sentAt: Date | null;
      error: string | null;
    }>,
  ): ConfirmationSummaryDto {
    const latest = notifications[notifications.length - 1];

    if (!latest) {
      return {
        status: 'NOT_SENT',
        lastSentAt: null,
        errorMessage: null,
      };
    }

    if (latest.status === NotificationStatus.SENT) {
      return {
        status: 'SENT',
        lastSentAt: latest.sentAt?.toISOString() ?? null,
        errorMessage: null,
      };
    }

    if (latest.status === NotificationStatus.FAILED) {
      return {
        status: 'FAILED',
        lastSentAt: latest.sentAt?.toISOString() ?? null,
        errorMessage: latest.error,
      };
    }

    return {
      status: 'NOT_SENT',
      lastSentAt: latest.sentAt?.toISOString() ?? null,
      errorMessage: latest.error,
    };
  }

  private buildReminderSummary(
    type: ReminderType,
    offsetMs: number,
    job: {
      startAt: Date;
      status: JobStatus;
      client: { email: string | null };
    },
    notifications: Array<{
      status: NotificationStatus;
      scheduledAt: Date | null;
      sentAt: Date | null;
      error: string | null;
    }>,
  ): ReminderSummaryDto {
    const latest = notifications[notifications.length - 1];
    const scheduledFor = new Date(job.startAt.getTime() - offsetMs);

    if (!latest) {
      const eligibleToSchedule =
        process.env.NOTIFICATIONS_EMAIL_ENABLED === 'true' &&
        job.status === JobStatus.SCHEDULED &&
        Boolean(job.client.email?.trim()) &&
        scheduledFor.getTime() > Date.now();

      return {
        type,
        status: eligibleToSchedule ? 'SCHEDULED' : 'NOT_APPLICABLE',
        scheduledFor: eligibleToSchedule ? scheduledFor.toISOString() : null,
        sentAt: null,
        errorMessage: eligibleToSchedule
          ? null
          : this.getReminderNotApplicableReason(job, scheduledFor),
      };
    }

    return {
      type,
      status: this.mapReminderStatus(latest.status),
      scheduledFor:
        latest.scheduledAt?.toISOString() ??
        (scheduledFor.getTime() > Date.now() ? scheduledFor.toISOString() : null),
      sentAt: latest.sentAt?.toISOString() ?? null,
      errorMessage: latest.error,
    };
  }

  private getReminderNotApplicableReason(
    job: {
      status: JobStatus;
      client: { email: string | null };
    },
    scheduledFor: Date,
  ) {
    if (process.env.NOTIFICATIONS_EMAIL_ENABLED !== 'true') {
      return 'Email notifications are disabled.';
    }

    if (!job.client.email?.trim()) {
      return 'Client email missing.';
    }

    if (job.status !== JobStatus.SCHEDULED) {
      return 'Reminder is only available for scheduled jobs.';
    }

    if (scheduledFor.getTime() <= Date.now()) {
      return 'Reminder window has passed.';
    }

    return null;
  }

  private mapReminderStatus(
    status: NotificationStatus,
  ): ReminderSummaryDto['status'] {
    switch (status) {
      case NotificationStatus.QUEUED:
        return 'SCHEDULED';
      case NotificationStatus.SENT:
        return 'SENT';
      case NotificationStatus.FAILED:
        return 'FAILED';
      case NotificationStatus.CANCELED:
        return 'CANCELED';
      case NotificationStatus.SKIPPED:
      default:
        return 'NOT_APPLICABLE';
    }
  }

  private buildJobConfirmationEmail(job: {
    company: { name: string; timezone: string };
    client: { name: string; address: string | null };
    worker: { displayName: string } | null;
    title: string | null;
    startAt: Date;
    location: string | null;
    bookingAccessLink?: { token: string } | null;
  }) {
    return jobConfirmation({
      companyName: job.company.name,
      clientName: job.client.name,
      workerName: job.worker?.displayName ?? null,
      serviceName: job.title,
      startAtISO: job.startAt.toISOString(),
      timezone: job.company.timezone,
      location: job.location ?? job.client.address ?? null,
      manageUrl: job.bookingAccessLink?.token
        ? buildBookingAccessUrl(job.bookingAccessLink.token)
        : null,
    });
  }

  private async getJobManageUrl(companyId: string, jobId: string) {
    const link = await this.prisma.bookingAccessLink.upsert({
      where: { jobId },
      create: {
        companyId,
        jobId,
        token: createBookingAccessToken(),
        expiresAt: getBookingAccessExpiry(),
      },
      update: {},
    });

    return buildBookingAccessUrl(link.token);
  }

  private mapClientLastCommunication(notification: {
    type: string;
    sentAt: Date | null;
    recipient: string | null;
    targetId: string;
  }): ClientLastCommunicationDto | null {
    if (!notification.sentAt) {
      return null;
    }

    if (notification.type === TYPE_JOB_CONFIRMATION) {
      return {
        channel: 'EMAIL',
        type: 'CONFIRMATION',
        label: 'Confirmation email',
        sentAt: notification.sentAt.toISOString(),
        recipient: notification.recipient,
        jobId: notification.targetId,
      };
    }

    const reminder = EMAIL_REMINDER_DEFINITIONS.find(
      (definition) => definition.type === notification.type,
    );

    if (!reminder) {
      return null;
    }

    return {
      channel: 'EMAIL',
      type: reminder.apiType,
      label: reminder.label,
      sentAt: notification.sentAt.toISOString(),
      recipient: notification.recipient,
      jobId: notification.targetId,
    };
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

