import { SendEmailInput, ProviderResult } from '../notification.types';

export interface EmailProvider {
    sendEmail(input: SendEmailInput): Promise<ProviderResult>;
}
import { Worker, Queue } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { TwilioSmsProvider } from '../providers/twilio.provider';
import { QUEUE_SMS, QUEUE_SMS_DLQ, MAX_ATTEMPTS } from '../notification.constants';

const connection = {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
};

const prisma = new PrismaClient();
const smsProvider = new TwilioSmsProvider();

export type SmsJobPayload = {
    companyId: string;
    notificationId: string;
};

export const smsQueue = new Queue<SmsJobPayload>(QUEUE_SMS, { connection });
export const smsDlq = new Queue<SmsJobPayload>(QUEUE_SMS_DLQ, { connection });

export const smsWorker = new Worker<SmsJobPayload>(
    QUEUE_SMS,
    async (job) => {
        const { notificationId, companyId } = job.data;

        const notif = await prisma.notification.findUnique({ where: { id: notificationId } });
        if (!notif || notif.channel !== 'SMS' || notif.status !== 'QUEUED') return;

        const payload = notif.payload as any;
        const jobId: string | undefined = payload?.jobId;
        if (!jobId) throw new Error('payload.jobId missing');

        const [jobEntity, company, client] = await Promise.all([
            prisma.job.findUnique({ where: { id: jobId } }),
            prisma.company.findUnique({ where: { id: companyId } }),
            payload?.clientId ? prisma.clientProfile.findUnique({ where: { id: payload.clientId } }) : null,
        ]);

        if (!jobEntity || !company) throw new Error('job/company not found');

        const smsEnabled = process.env.NOTIFICATIONS_SMS_ENABLED === 'true';
        if (!smsEnabled) {
            await prisma.notification.update({
                where: { id: notificationId },
                data: { status: 'FAILED', error: 'SMS notifications disabled' },
            });
            return;
        }
        const toPhone = client?.phone;
        if (!toPhone) {
            await prisma.notification.update({
                where: { id: notificationId },
                data: { status: 'FAILED', error: 'Client phone missing' },
            });
            return;
        }

        const start = jobEntity.startAt.toLocaleString('en-CA', { timeZone: company.timezone });
        const body = (notif.type === 'job_reminder_24h')
            ? `Reminder: your appointment is tomorrow at ${start} (${company.timezone}).`
            : `Reminder: your appointment starts in 2 hours at ${start} (${company.timezone}).`;

        const from = process.env.TWILIO_FROM_NUMBER || '';
        const res = await smsProvider.sendSms({ to: toPhone, from, body });
        if (res.ok) {
            await prisma.notification.update({
                where: { id: notificationId },
                data: { status: 'SENT', sentAt: new Date(), error: null },
            });
        } else {
            throw new Error(res.errorMessage || 'sms send failed');
        }
    },
    { connection, concurrency: 5 }
);

smsWorker.on('failed', async (job, err) => {
    if (!job) return;
    if ((job.attemptsMade ?? 0) >= MAX_ATTEMPTS) {
        await smsDlq.add('dead', job.data, { removeOnComplete: true, removeOnFail: true });
        try {
            await prisma.notification.update({
                where: { id: job.data.notificationId },
                data: { status: 'FAILED', error: err?.message?.slice(0, 500) ?? 'failed' },
            });
        } catch {}
    }
});
