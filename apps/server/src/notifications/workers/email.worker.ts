import { Queue, Worker } from 'bullmq';
import { JobStatus, PrismaClient } from '@prisma/client';
import { selectEmailProvider } from '../providers/email.provider';
import { ResendEmailProvider } from '../providers/resend.provider';
import { SmtpEmailProvider } from '../providers/smtp.provider';
import {
  MAX_ATTEMPTS,
  QUEUE_EMAIL,
  QUEUE_EMAIL_DLQ,
} from '../notification.constants';
import { jobReminder24h } from '../templates/jobReminder24h';
import { jobReminder1h } from '../templates/jobReminder1h';

const connection = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6379),
};

const prisma = new PrismaClient();
const emailProvider = selectEmailProvider({
  smtp: new SmtpEmailProvider(),
  resend: new ResendEmailProvider(),
});

export type EmailJobPayload = {
  companyId: string;
  notificationId: string;
};

export const emailQueue = new Queue<EmailJobPayload>(QUEUE_EMAIL, {
  connection,
});
export const emailDlq = new Queue<EmailJobPayload>(QUEUE_EMAIL_DLQ, {
  connection,
});

async function updateNotificationStatus(
  notificationId: string,
  status: 'SENT' | 'FAILED' | 'CANCELED' | 'SKIPPED',
  data?: {
    error?: string | null;
    sentAt?: Date | null;
    recipient?: string | null;
    providerMessageId?: string | null;
  },
) {
  await prisma.notification.update({
    where: { id: notificationId },
    data: {
      status: status as any,
      error: data?.error ?? null,
      sentAt: data?.sentAt,
      recipient: data?.recipient,
      providerMessageId: data?.providerMessageId,
    },
  } as any);
}

export const emailWorker = new Worker<EmailJobPayload>(
  QUEUE_EMAIL,
  async (job) => {
    const { notificationId, companyId } = job.data;

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (
      !notification ||
      notification.channel !== 'EMAIL' ||
      notification.status !== 'QUEUED'
    ) {
      return;
    }

    const payload = notification.payload as {
      jobId?: string;
      manageUrl?: string | null;
    };
    const jobId = payload?.jobId;
    if (!jobId) {
      await updateNotificationStatus(notificationId, 'FAILED', {
        error: 'payload.jobId missing',
      });
      return;
    }

    const jobEntity = await prisma.job.findFirst({
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
      await updateNotificationStatus(notificationId, 'SKIPPED', {
        error: 'Job not found',
      });
      return;
    }

    if (jobEntity.status === JobStatus.CANCELED) {
      await updateNotificationStatus(notificationId, 'CANCELED', {
        error: 'Job canceled before reminder send',
      });
      return;
    }

    if (jobEntity.status === JobStatus.DONE) {
      await updateNotificationStatus(notificationId, 'SKIPPED', {
        error: 'Job already completed before reminder send',
      });
      return;
    }

    const emailEnabled = process.env.NOTIFICATIONS_EMAIL_ENABLED === 'true';
    if (!emailEnabled) {
      await updateNotificationStatus(notificationId, 'SKIPPED', {
        error: 'Email notifications disabled',
      });
      return;
    }

    const toEmail = jobEntity.client.email?.trim().toLowerCase() ?? null;
    if (!toEmail) {
      await updateNotificationStatus(notificationId, 'CANCELED', {
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

    const result = await emailProvider.sendEmail({
      to: toEmail,
      from,
      subject,
      html,
    });

    if (!result.ok) {
      throw new Error(result.errorMessage || 'email send failed');
    }

    await updateNotificationStatus(notificationId, 'SENT', {
      sentAt: new Date(),
      recipient: toEmail,
      providerMessageId: result.messageId ?? null,
      error: null,
    });
  },
  {
    connection,
    concurrency: 5,
  },
);

emailWorker.on('failed', async (job, err) => {
  if (!job) return;

  if ((job.attemptsMade ?? 0) >= MAX_ATTEMPTS) {
    await emailDlq.add('dead', job.data, {
      removeOnComplete: true,
      removeOnFail: true,
    });
    try {
      await updateNotificationStatus(job.data.notificationId, 'FAILED', {
        error: err?.message?.slice(0, 500) ?? 'failed',
      });
    } catch {}
  }
});
