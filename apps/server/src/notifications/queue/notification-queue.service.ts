import {
  Injectable,
  OnModuleDestroy,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { AppLogger } from '@/observability/app-logger.service';
import { RequestContextService } from '@/observability/request-context.service';
import {
  MAX_ATTEMPTS,
  QUEUE_EMAIL,
  QUEUE_EMAIL_DLQ,
  QUEUE_SMS,
  QUEUE_SMS_DLQ,
} from '../notification.constants';
import {
  type EmailJobPayload,
  type SmsJobPayload,
} from './notification-queue.types';
import { getRedisConnection } from './redis.config';

@Injectable()
export class NotificationQueueService implements OnModuleDestroy {
  private readonly connection = getRedisConnection();

  private readonly emailQueue = new Queue<EmailJobPayload>(QUEUE_EMAIL, {
    connection: this.connection,
  });

  private readonly emailDlq = new Queue<EmailJobPayload>(QUEUE_EMAIL_DLQ, {
    connection: this.connection,
  });

  private readonly smsQueue = new Queue<SmsJobPayload>(QUEUE_SMS, {
    connection: this.connection,
  });

  private readonly smsDlq = new Queue<SmsJobPayload>(QUEUE_SMS_DLQ, {
    connection: this.connection,
  });

  constructor(
    private readonly logger: AppLogger,
    private readonly requestContext: RequestContextService,
  ) {}

  async scheduleEmailReminder(input: {
    jobId: string;
    reminderKey: string;
    companyId: string;
    notificationId: string;
    scheduledAt: Date;
  }) {
    const queueJobId = this.buildEmailReminderQueueJobId(input.jobId, input.reminderKey);
    const delay = Math.max(0, input.scheduledAt.getTime() - Date.now());

    await this.emailQueue.add(
      'send',
      {
        companyId: input.companyId,
        notificationId: input.notificationId,
        trace: this.requestContext.createAsyncTraceLink({
          companyId: input.companyId,
        }),
      },
      {
        jobId: queueJobId,
        delay,
        attempts: MAX_ATTEMPTS,
        backoff: {
          type: 'exponential',
          delay: 5_000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.debugEvent('notification.email.queued', {
      queueJobId,
      notificationId: input.notificationId,
      scheduledAt: input.scheduledAt.toISOString(),
    });
  }

  async cancelEmailReminder(jobId: string, reminderKey: string) {
    const queueJobId = this.buildEmailReminderQueueJobId(jobId, reminderKey);
    await this.emailQueue.remove(queueJobId).catch(() => undefined);
    this.logger.info('notification.email.canceled', {
      queueJobId,
      jobId,
      reminderKey,
    });
  }

  async moveEmailToDlq(payload: EmailJobPayload) {
    await this.emailDlq.add('dead', payload, {
      removeOnComplete: true,
      removeOnFail: true,
    });
    this.logger.warnEvent('notification.email.moved_to_dlq', {
      notificationId: payload.notificationId,
      trace: payload.trace,
    });
  }

  async moveSmsToDlq(payload: SmsJobPayload) {
    await this.smsDlq.add('dead', payload, {
      removeOnComplete: true,
      removeOnFail: true,
    });
    this.logger.warnEvent('notification.sms.moved_to_dlq', {
      notificationId: payload.notificationId,
      trace: payload.trace,
    });
  }

  getConnection() {
    return this.connection;
  }

  async getHealthSnapshot() {
    try {
      const client = await this.emailQueue.client;
      await client.ping();

      const [email, emailDlq, sms, smsDlq] = await Promise.all([
        this.emailQueue.getJobCounts('waiting', 'active', 'delayed', 'failed', 'completed'),
        this.emailDlq.getJobCounts('waiting', 'active', 'delayed', 'failed', 'completed'),
        this.smsQueue.getJobCounts('waiting', 'active', 'delayed', 'failed', 'completed'),
        this.smsDlq.getJobCounts('waiting', 'active', 'delayed', 'failed', 'completed'),
      ]);

      return {
        redis: 'up' as const,
        email,
        emailDlq,
        sms,
        smsDlq,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Redis error';

      return {
        redis: 'down' as const,
        error: message,
        email: null,
        emailDlq: null,
        sms: null,
        smsDlq: null,
      };
    }
  }

  async onModuleDestroy() {
    await Promise.allSettled([
      this.emailQueue.close(),
      this.emailDlq.close(),
      this.smsQueue.close(),
      this.smsDlq.close(),
    ]);
  }

  private buildEmailReminderQueueJobId(jobId: string, reminderKey: string) {
    return `job:${jobId}:email:${reminderKey}`;
  }
}
