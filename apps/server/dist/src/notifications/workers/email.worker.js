"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailWorker = exports.emailDlq = exports.emailQueue = void 0;
const bullmq_1 = require("bullmq");
const client_1 = require("@prisma/client");
const resend_provider_1 = require("../providers/resend.provider");
const notification_constants_1 = require("../notification.constants");
const jobReminder24h_1 = require("../templates/jobReminder24h");
const jobReminder1h_1 = require("../templates/jobReminder1h");
const connection = {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
};
const prisma = new client_1.PrismaClient();
const emailProvider = new resend_provider_1.ResendEmailProvider();
exports.emailQueue = new bullmq_1.Queue(notification_constants_1.QUEUE_EMAIL, {
    connection,
});
exports.emailDlq = new bullmq_1.Queue(notification_constants_1.QUEUE_EMAIL_DLQ, {
    connection,
});
async function updateNotificationStatus(notificationId, status, data) {
    await prisma.notification.update({
        where: { id: notificationId },
        data: {
            status: status,
            error: data?.error ?? null,
            sentAt: data?.sentAt,
            recipient: data?.recipient,
            providerMessageId: data?.providerMessageId,
        },
    });
}
exports.emailWorker = new bullmq_1.Worker(notification_constants_1.QUEUE_EMAIL, async (job) => {
    const { notificationId, companyId } = job.data;
    const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
    });
    if (!notification ||
        notification.channel !== 'EMAIL' ||
        notification.status !== 'QUEUED') {
        return;
    }
    const payload = notification.payload;
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
    if (jobEntity.status === client_1.JobStatus.CANCELED) {
        await updateNotificationStatus(notificationId, 'CANCELED', {
            error: 'Job canceled before reminder send',
        });
        return;
    }
    if (jobEntity.status === client_1.JobStatus.DONE) {
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
    let subject;
    let html;
    if (notification.type === 'job_reminder_24h') {
        const template = (0, jobReminder24h_1.jobReminder24h)(vars);
        subject = template.subject;
        html = template.html;
    }
    else if (notification.type === 'job_reminder_1h') {
        const template = (0, jobReminder1h_1.jobReminder1h)(vars);
        subject = template.subject;
        html = template.html;
    }
    else {
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
}, {
    connection,
    concurrency: 5,
});
exports.emailWorker.on('failed', async (job, err) => {
    if (!job)
        return;
    if ((job.attemptsMade ?? 0) >= notification_constants_1.MAX_ATTEMPTS) {
        await exports.emailDlq.add('dead', job.data, {
            removeOnComplete: true,
            removeOnFail: true,
        });
        try {
            await updateNotificationStatus(job.data.notificationId, 'FAILED', {
                error: err?.message?.slice(0, 500) ?? 'failed',
            });
        }
        catch { }
    }
});
//# sourceMappingURL=email.worker.js.map