import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  JobStatus,
  NotificationChannel,
  NotificationStatus,
} from '@prisma/client';
import { Job, Worker } from 'bullmq';
import { PrismaService } from '@/prisma/prisma.service';
import { AppLogger } from '@/observability/app-logger.service';
import { RequestContextService } from '@/observability/request-context.service';
import {
  EMAIL_PROVIDER,
  type EmailProvider,
} from './providers/email.provider';
import { TwilioSmsProvider } from './providers/twilio.provider';
import {
  MAX_ATTEMPTS,
  QUEUE_EMAIL,
  QUEUE_SMS,
} from './notification.constants';
import { jobReminder24h } from './templates/jobReminder24h';
import { jobReminder1h } from './templates/jobReminder1h';
import { NotificationQueueService } from './queue/notification-queue.service';
import {
  type EmailJobPayload,
  type SmsJobPayload,
} from './queue/notification-queue.types';

@Injectable()
export class NotificationWorkerService implements OnModuleInit, OnModuleDestroy {
  private emailWorker: Worker<EmailJobPayload> | null = null;
  private smsWorker: Worker<SmsJobPayload> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly queues: NotificationQueueService,
    private readonly logger: AppLogger,
    private readonly requestContext: RequestContextService,
    @Inject(EMAIL_PROVIDER)
    private readonly emailProvider: EmailProvider,
    private readonly smsProvider: TwilioSmsProvider,
  ) {}

  onModuleInit() {
    const connection = this.queues.getConnection();

    this.emailWorker = new Worker<EmailJobPayload>(
      QUEUE_EMAIL,
      async (job) =>
        this.runObservedJob('notification.email', QUEUE_EMAIL, job, () =>
          this.processEmail(job.data),
        ),
      {
        connection,
        concurrency: 5,
      },
    );

    this.smsWorker = new Worker<SmsJobPayload>(
      QUEUE_SMS,
      async (job) =>
        this.runObservedJob('notification.sms', QUEUE_SMS, job, () =>
          this.processSms(job.data),
        ),
      {
        connection,
        concurrency: 5,
      },
    );

    this.attachEventLogging();
    this.logger.info('notification.workers.started');
  }

  async onModuleDestroy() {
    await Promise.allSettled([
      this.emailWorker?.close(),
      this.smsWorker?.close(),
    ]);
  }

  private attachEventLogging() {
    this.emailWorker?.on('error', (error) => {
      this.logger.errorEvent('notification.email.worker_error', {
        queueName: QUEUE_EMAIL,
      }, error);
    });

    this.emailWorker?.on('completed', (job) => {
      this.logger.info('notification.email.completed', {
        queueJobId: String(job.id ?? ''),
        notificationId: job.data.notificationId,
      });
    });

    this.emailWorker?.on('failed', async (job, err) => {
      if (!job) {
        return;
      }

      this.logger.warnEvent('notification.email.failed', {
        queueJobId: String(job.id ?? ''),
        notificationId: job.data.notificationId,
        attemptsMade: job.attemptsMade,
        maxAttempts: job.opts.attempts ?? MAX_ATTEMPTS,
        errorMessage: err?.message ?? 'unknown error',
      });

      if ((job.attemptsMade ?? 0) >= MAX_ATTEMPTS) {
        await this.queues.moveEmailToDlq(job.data);
        try {
          await this.updateNotificationStatus(job.data.notificationId, 'FAILED', {
            error: err?.message?.slice(0, 500) ?? 'failed',
          });
        } catch (updateError) {
          this.logger.errorEvent(
            'notification.email.failure_persist_failed',
            {
              notificationId: job.data.notificationId,
            },
            updateError,
          );
        }
      }
    });

    this.smsWorker?.on('error', (error) => {
      this.logger.errorEvent('notification.sms.worker_error', {
        queueName: QUEUE_SMS,
      }, error);
    });

    this.smsWorker?.on('completed', (job) => {
      this.logger.info('notification.sms.completed', {
        queueJobId: String(job.id ?? ''),
        notificationId: job.data.notificationId,
      });
    });

    this.smsWorker?.on('failed', async (job, err) => {
      if (!job) {
        return;
      }

      this.logger.warnEvent('notification.sms.failed', {
        queueJobId: String(job.id ?? ''),
        notificationId: job.data.notificationId,
        attemptsMade: job.attemptsMade,
        maxAttempts: job.opts.attempts ?? MAX_ATTEMPTS,
        errorMessage: err?.message ?? 'unknown error',
      });

      if ((job.attemptsMade ?? 0) >= MAX_ATTEMPTS) {
        await this.queues.moveSmsToDlq(job.data);
        try {
          await this.prisma.notification.update({
            where: { id: job.data.notificationId },
            data: { status: 'FAILED', error: err?.message?.slice(0, 500) ?? 'failed' },
          });
        } catch (updateError) {
          this.logger.errorEvent(
            'notification.sms.failure_persist_failed',
            {
              notificationId: job.data.notificationId,
            },
            updateError,
          );
        }
      }
    });
  }

  private async runObservedJob<T>(
    workerName: string,
    queueName: string,
    job: Job<EmailJobPayload | SmsJobPayload>,
    fn: () => Promise<T>,
  ) {
    return this.requestContext.run(
      this.requestContext.createWorkerContext({
        trace: job.data.trace,
        companyId: job.data.companyId,
        worker: {
          name: workerName,
          queueName,
          queueJobId: job.id ? String(job.id) : null,
          attempt: (job.attemptsMade ?? 0) + 1,
        },
      }),
      async () => {
        this.logger.info('worker.job.started', {
          workerName,
          queueName,
          queueJobId: job.id ? String(job.id) : null,
          notificationId: job.data.notificationId,
        });

        try {
          const result = await fn();
          this.logger.info('worker.job.succeeded', {
            workerName,
            queueName,
            queueJobId: job.id ? String(job.id) : null,
            notificationId: job.data.notificationId,
          });
          return result;
        } catch (error) {
          this.logger.errorEvent(
            'worker.job.failed',
            {
              workerName,
              queueName,
              queueJobId: job.id ? String(job.id) : null,
              notificationId: job.data.notificationId,
            },
            error,
          );
          throw error;
        }
      },
    );
  }

  private async processEmail(input: EmailJobPayload) {
    const { notificationId, companyId } = input;

    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (
      !notification ||
      notification.channel !== NotificationChannel.EMAIL ||
      notification.status !== NotificationStatus.QUEUED
    ) {
      return;
    }

    const payload = notification.payload as {
      jobId?: string;
      manageUrl?: string | null;
    };
    const jobId = payload?.jobId;

    if (!jobId) {
      await this.updateNotificationStatus(notificationId, 'FAILED', {
        error: 'payload.jobId missing',
      });
      return;
    }

    const jobEntity = await this.prisma.job.findFirst({
      where: {
        id: jobId,
        companyId,
      },
      include: {
        company: true,
        client: true,
        worker: true,
      },
    });

    if (!jobEntity) {
      await this.updateNotificationStatus(notificationId, 'SKIPPED', {
        error: 'Job not found',
      });
      return;
    }

    if (jobEntity.status === JobStatus.CANCELED) {
      await this.updateNotificationStatus(notificationId, 'CANCELED', {
        error: 'Job canceled before reminder send',
      });
      return;
    }

    if (jobEntity.status === JobStatus.DONE) {
      await this.updateNotificationStatus(notificationId, 'SKIPPED', {
        error: 'Job already completed before reminder send',
      });
      return;
    }

    if (process.env.NOTIFICATIONS_EMAIL_ENABLED !== 'true') {
      await this.updateNotificationStatus(notificationId, 'SKIPPED', {
        error: 'Email notifications disabled',
      });
      return;
    }

    const toEmail = jobEntity.client.email?.trim().toLowerCase() ?? null;
    if (!toEmail) {
      await this.updateNotificationStatus(notificationId, 'CANCELED', {
        error: 'Client email missing',
      });
      return;
    }

    const from = process.env.NOTIFY_FROM_EMAIL?.trim();
    if (!from) {
      throw new Error('NOTIFY_FROM_EMAIL not set');
    }

    const vars = {
      companyName: jobEntity.company.name,
      clientName: jobEntity.client.name,
      workerName: jobEntity.worker?.displayName ?? null,
      serviceName: null,
      startAtISO: jobEntity.startAt.toISOString(),
      timezone: jobEntity.company.timezone,
      location: jobEntity.location ?? jobEntity.client.address ?? null,
      manageUrl: payload?.manageUrl ?? null,
    };

    let subject: string;
    let html: string;

    if (notification.type === 'job_reminder_24h') {
      const template = jobReminder24h(vars);
      subject = template.subject;
      html = template.html;
    } else if (notification.type === 'job_reminder_1h') {
      const template = jobReminder1h(vars);
      subject = template.subject;
      html = template.html;
    } else {
      throw new Error(`Unknown email template type: ${notification.type}`);
    }

    const result = await this.emailProvider.sendEmail({
      to: toEmail,
      from,
      subject,
      html,
    });

    if (!result.ok) {
      throw new Error(result.errorMessage || 'email send failed');
    }

    await this.updateNotificationStatus(notificationId, 'SENT', {
      sentAt: new Date(),
      recipient: toEmail,
      providerMessageId: result.messageId ?? null,
      error: null,
    });
  }

  private async processSms(input: SmsJobPayload) {
    const { notificationId, companyId } = input;

    const notif = await this.prisma.notification.findUnique({ where: { id: notificationId } });
    if (
      !notif ||
      notif.channel !== NotificationChannel.SMS ||
      notif.status !== NotificationStatus.QUEUED
    ) {
      return;
    }

    const payload = notif.payload as { jobId?: string; clientId?: string | null };
    const jobId = payload?.jobId;
    if (!jobId) {
      throw new Error('payload.jobId missing');
    }

    const [jobEntity, company, client] = await Promise.all([
      this.prisma.job.findUnique({ where: { id: jobId } }),
      this.prisma.company.findUnique({ where: { id: companyId } }),
      payload?.clientId
        ? this.prisma.clientProfile.findUnique({ where: { id: payload.clientId } })
        : null,
    ]);

    if (!jobEntity || !company) {
      throw new Error('job/company not found');
    }

    if (process.env.NOTIFICATIONS_SMS_ENABLED !== 'true') {
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { status: 'FAILED', error: 'SMS notifications disabled' },
      });
      return;
    }

    const toPhone = client?.phone;
    if (!toPhone) {
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { status: 'FAILED', error: 'Client phone missing' },
      });
      return;
    }

    const start = jobEntity.startAt.toLocaleString('en-CA', {
      timeZone: company.timezone,
    });
    const body =
      notif.type === 'job_reminder_24h'
        ? `Reminder: your appointment is tomorrow at ${start} (${company.timezone}).`
        : `Reminder: your appointment starts in 2 hours at ${start} (${company.timezone}).`;

    const from = process.env.TWILIO_FROM_NUMBER || '';
    const res = await this.smsProvider.sendSms({ to: toPhone, from, body });

    if (res.ok) {
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { status: 'SENT', sentAt: new Date(), error: null },
      });
      return;
    }

    throw new Error(res.errorMessage || 'sms send failed');
  }

  private async updateNotificationStatus(
    notificationId: string,
    status: 'SENT' | 'FAILED' | 'CANCELED' | 'SKIPPED',
    data?: {
      error?: string | null;
      sentAt?: Date | null;
      recipient?: string | null;
      providerMessageId?: string | null;
    },
  ) {
    await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: status as NotificationStatus,
        error: data?.error ?? null,
        sentAt: data?.sentAt,
        recipient: data?.recipient,
        providerMessageId: data?.providerMessageId,
      } as never,
    });
  }
}
