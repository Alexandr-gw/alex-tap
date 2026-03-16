"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const email_worker_1 = require("./workers/email.worker");
const sms_worker_1 = require("./workers/sms.worker");
const notification_constants_1 = require("./notification.constants");
const prisma = new client_1.PrismaClient();
function bullBackoff(attempt) {
    const waits = [5_000, 30_000, 120_000, 600_000, 1_800_000];
    return waits[Math.min(attempt - 1, waits.length - 1)];
}
let NotificationService = class NotificationService {
    async enqueueJobReminders(companyId, jobId) {
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            include: {
                company: true,
                client: true,
                worker: true,
            },
        });
        if (!job)
            throw new Error('job not found');
        const t24 = new Date(job.startAt.getTime() - 24 * 60 * 60 * 1000);
        const t2 = new Date(job.startAt.getTime() - 2 * 60 * 60 * 1000);
        const emailEnabled = process.env.NOTIFICATIONS_EMAIL_ENABLED === 'true';
        const smsEnabled = process.env.NOTIFICATIONS_SMS_ENABLED === 'true';
        const basePayload = {
            jobId: job.id,
            clientId: job.clientId,
            workerId: job.workerId ?? null,
            manageUrl: null,
        };
        const createAndEnqueue = async (type, channel, scheduledAt) => {
            const notifType = type === '24h' ? notification_constants_1.TYPE_JOB_REMINDER_24H : notification_constants_1.TYPE_JOB_REMINDER_2H;
            const existing = await prisma.notification.findFirst({
                where: {
                    companyId,
                    type: notifType,
                    channel,
                    targetType: 'JOB',
                    targetId: job.id,
                    status: 'QUEUED',
                    scheduledAt,
                },
            });
            if (existing)
                return existing;
            const notification = await prisma.notification.create({
                data: {
                    companyId,
                    type: notifType,
                    channel,
                    status: 'QUEUED',
                    targetType: 'JOB',
                    targetId: job.id,
                    payload: basePayload,
                    scheduledAt,
                },
            });
            const jobIdKey = `job:${job.id}:${channel.toLowerCase()}:${type}`;
            const opts = {
                jobId: jobIdKey,
                delay: Math.max(0, scheduledAt.getTime() - Date.now()),
                attempts: notification_constants_1.MAX_ATTEMPTS,
                backoff: {
                    type: 'exponential',
                    delay: 5_000,
                },
                removeOnComplete: true,
                removeOnFail: false,
            };
            if (channel === 'EMAIL') {
                await email_worker_1.emailQueue.add('send', { companyId, notificationId: notification.id }, opts);
            }
            else if (channel === 'SMS') {
                await sms_worker_1.smsQueue.add('send', { companyId, notificationId: notification.id }, opts);
            }
            return notification;
        };
        const promises = [];
        if (emailEnabled && job.client.email) {
            promises.push(createAndEnqueue('24h', 'EMAIL', t24));
            promises.push(createAndEnqueue('2h', 'EMAIL', t2));
        }
        if (smsEnabled && job.client.phone) {
            promises.push(createAndEnqueue('24h', 'SMS', t24));
            promises.push(createAndEnqueue('2h', 'SMS', t2));
        }
        await Promise.all(promises);
    }
};
exports.NotificationService = NotificationService;
exports.NotificationService = NotificationService = __decorate([
    (0, common_1.Injectable)()
], NotificationService);
//# sourceMappingURL=notification.service.js.map