"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailWorker = exports.emailDlq = exports.emailQueue = void 0;
const bullmq_1 = require("bullmq");
const client_1 = require("@prisma/client");
const resend_provider_1 = require("../providers/resend.provider");
const notification_constants_1 = require("../notification.constants");
const jobReminder24h_1 = require("../templates/jobReminder24h");
const jobReminder2h_1 = require("../templates/jobReminder2h");
const connection = {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
};
const prisma = new client_1.PrismaClient();
const emailProvider = new resend_provider_1.ResendEmailProvider();
exports.emailQueue = new bullmq_1.Queue(notification_constants_1.QUEUE_EMAIL, { connection });
exports.emailDlq = new bullmq_1.Queue(notification_constants_1.QUEUE_EMAIL_DLQ, { connection });
exports.emailWorker = new bullmq_1.Worker(notification_constants_1.QUEUE_EMAIL, async (job) => {
    const { notificationId, companyId } = job.data;
    const notif = await prisma.notification.findUnique({ where: { id: notificationId } });
    if (!notif)
        return;
    if (notif.status !== 'QUEUED')
        return;
    if (notif.channel !== 'EMAIL')
        return;
    const payload = notif.payload;
    const jobId = payload?.jobId;
    if (!jobId)
        throw new Error('payload.jobId missing');
    const [jobEntity, company, client, worker] = await Promise.all([
        prisma.job.findUnique({ where: { id: jobId } }),
        prisma.company.findUnique({ where: { id: companyId } }),
        payload?.clientId ? prisma.clientProfile.findUnique({ where: { id: payload.clientId } }) : null,
        payload?.workerId ? prisma.worker.findUnique({ where: { id: payload.workerId } }) : null,
    ]);
    if (!jobEntity || !company)
        throw new Error('job or company not found');
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
    let subject, html;
    if (notif.type === 'job_reminder_24h') {
        const t = (0, jobReminder24h_1.jobReminder24h)(vars);
        subject = t.subject;
        html = t.html;
    }
    else if (notif.type === 'job_reminder_2h') {
        const t = (0, jobReminder2h_1.jobReminder2h)(vars);
        subject = t.subject;
        html = t.html;
    }
    else {
        throw new Error(`Unknown email template type: ${notif.type}`);
    }
    await prisma.notification.update({
        where: { id: notificationId },
        data: { status: 'QUEUED' },
    });
    const result = await emailProvider.sendEmail({ to: toEmail, from, subject, html });
    if (result.ok) {
        await prisma.notification.update({
            where: { id: notificationId },
            data: { status: 'SENT', sentAt: new Date(), error: null },
        });
    }
    else {
        throw new Error(result.errorMessage || 'email send failed');
    }
}, {
    connection,
    concurrency: 5,
});
exports.emailWorker.on('failed', async (job, err) => {
    if (!job)
        return;
    const attemptsMade = job.attemptsMade ?? 0;
    if (attemptsMade >= notification_constants_1.MAX_ATTEMPTS) {
        await exports.emailDlq.add('dead', job.data, { removeOnComplete: true, removeOnFail: true });
        try {
            await prisma.notification.update({
                where: { id: job.data.notificationId },
                data: { status: 'FAILED', error: err?.message?.slice(0, 500) ?? 'failed' },
            });
        }
        catch { }
    }
});
//# sourceMappingURL=email.worker.js.map