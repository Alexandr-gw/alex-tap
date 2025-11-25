import { Worker, Queue, QueueEvents, JobsOptions } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { ResendEmailProvider } from '../providers/resend.provider';
import { QUEUE_EMAIL, QUEUE_EMAIL_DLQ, MAX_ATTEMPTS } from '../notifications.constants';
import { jobReminder24h } from '../templates/jobReminder24h';
import { jobReminder2h } from '../templates/jobReminder2h';

const connection = {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
};

const prisma = new PrismaClient();
const emailProvider = new ResendEmailProvider();

export type EmailJobPayload = {
    companyId: string;
    notificationId: string;
    // We keep PII out of payload; we re-fetch from DB
};

export const emailQueue = new Queue<EmailJobPayload>(QUEUE_EMAIL, { connection });
export const emailDlq = new Queue<EmailJobPayload>(QUEUE_EMAIL_DLQ, { connection });

export const emailWorker = new Worker<EmailJobPayload>(
    QUEUE_EMAIL,
    async (job) => {
        const { notificationId, companyId } = job.data;

        // Re-fetch Notification + Job + Client + Company
        const notif = await prisma.notification.findUnique({ where: { id: notificationId } });
        if (!notif) return;

        // Guard: cancelled or already sent
        if (notif.status !== 'QUEUED') return;

        // Only process EMAIL channel
        if (notif.channel !== 'EMAIL') return;

        // Target = JOB|CLIENT|COMPANY (we expect JOB for reminders)
        const payload = notif.payload as any;
        const jobId: string | undefined = payload?.jobId;
        if (!jobId) throw new Error('payload.jobId missing');

        const [jobEntity, company, client, worker] = await Promise.all([
            prisma.job.findUnique({ where: { id: jobId } }),
            prisma.company.findUnique({ where: { id: companyId } }),
            payload?.clientId ? prisma.clientProfile.findUnique({ where: { id: payload.clientId } }) : null,
            payload?.workerId ? prisma.worker.findUnique({ where: { id: payload.workerId } }) : null,
        ]);

        if (!jobEntity || !company) throw new Error('job or company not found');

        // Consent rule: require client email + feature flag
        const emailEnabled = process.env.NOTIFICATIONS_EMAIL_ENABLED === 'true';
        if (!emailEnabled) {
            await prisma.notification.update({
                where: { id: notificationId },
                data: { status: 'FAILED', error: 'Email notifications disabled' },
            });
            return;
        }
        const toEmail = client?.email;
        if (!toEmail) {
            await prisma.notification.update({
                where: { id: notificationId },
                data: { status: 'FAILED', error: 'Client email missing' },
            });
            return;
        }

        // Build template
        const vars = {
            companyName: company.name,
            clientName: client?.name ?? null,
            workerName: worker?.displayName ?? null,
            serviceName: null,
            startAtISO: jobEntity.startAt.toISOString(),
            timezone: company.timezone,
            location: jobEntity.location ?? null,
            manageUrl: payload?.manageUrl ?? null,
        };

        const from = process.env.NOTIFY_FROM_EMAIL || 'no-reply@example.com';

        let subject: string, html: string;
        if (notif.type === 'job_reminder_24h') {
            const t = jobReminder24h(vars);
            subject = t.subject; html = t.html;
        } else if (notif.type === 'job_reminder_2h') {
            const t = jobReminder2h(vars);
            subject = t.subject; html = t.html;
        } else {
            throw new Error(`Unknown email template type: ${notif.type}`);
        }

        // Mark sending (optional granularity)
        await prisma.notification.update({
            where: { id: notificationId },
            data: { status: 'QUEUED' }, // remains queued until success/final fail
        });

        const result = await emailProvider.sendEmail({ to: toEmail, from, subject, html });

        if (result.ok) {
            await prisma.notification.update({
                where: { id: notificationId },
                data: { status: 'SENT', sentAt: new Date(), error: null },
            });
        } else {
            // throw to let BullMQ retry/backoff; last attempt will land in failed handler
            throw new Error(result.errorMessage || 'email send failed');
        }
    },
    {
        connection,
        concurrency: 5,
        // Attempts & backoff are better set at enqueue time; this is fine as fallback
    }
);

// DLQ move on final fail
emailWorker.on('failed', async (job, err) => {
    if (!job) return;
    const attemptsMade = job.attemptsMade ?? 0;
    if (attemptsMade >= MAX_ATTEMPTS) {
        await emailDlq.add('dead', job.data, { removeOnComplete: true, removeOnFail: true });
        // Persist failure in Notification
        try {
            await prisma.notification.update({
                where: { id: job.data.notificationId },
                data: { status: 'FAILED', error: err?.message?.slice(0, 500) ?? 'failed' },
            });
        } catch {}
    }
});
