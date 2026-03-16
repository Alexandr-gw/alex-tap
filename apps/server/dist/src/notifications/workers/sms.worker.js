"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.smsWorker = exports.smsDlq = exports.smsQueue = void 0;
const bullmq_1 = require("bullmq");
const client_1 = require("@prisma/client");
const twilio_provider_1 = require("../providers/twilio.provider");
const notification_constants_1 = require("../notification.constants");
const connection = {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
};
const prisma = new client_1.PrismaClient();
const smsProvider = new twilio_provider_1.TwilioSmsProvider();
exports.smsQueue = new bullmq_1.Queue(notification_constants_1.QUEUE_SMS, { connection });
exports.smsDlq = new bullmq_1.Queue(notification_constants_1.QUEUE_SMS_DLQ, { connection });
exports.smsWorker = new bullmq_1.Worker(notification_constants_1.QUEUE_SMS, async (job) => {
    const { notificationId, companyId } = job.data;
    const notif = await prisma.notification.findUnique({ where: { id: notificationId } });
    if (!notif || notif.channel !== 'SMS' || notif.status !== 'QUEUED')
        return;
    const payload = notif.payload;
    const jobId = payload?.jobId;
    if (!jobId)
        throw new Error('payload.jobId missing');
    const [jobEntity, company, client] = await Promise.all([
        prisma.job.findUnique({ where: { id: jobId } }),
        prisma.company.findUnique({ where: { id: companyId } }),
        payload?.clientId ? prisma.clientProfile.findUnique({ where: { id: payload.clientId } }) : null,
    ]);
    if (!jobEntity || !company)
        throw new Error('job/company not found');
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
    }
    else {
        throw new Error(res.errorMessage || 'sms send failed');
    }
}, { connection, concurrency: 5 });
exports.smsWorker.on('failed', async (job, err) => {
    if (!job)
        return;
    if ((job.attemptsMade ?? 0) >= notification_constants_1.MAX_ATTEMPTS) {
        await exports.smsDlq.add('dead', job.data, { removeOnComplete: true, removeOnFail: true });
        try {
            await prisma.notification.update({
                where: { id: job.data.notificationId },
                data: { status: 'FAILED', error: err?.message?.slice(0, 500) ?? 'failed' },
            });
        }
        catch { }
    }
});
//# sourceMappingURL=sms.worker.js.map