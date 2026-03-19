"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const email_worker_1 = require("./workers/email.worker");
const notification_constants_1 = require("./notification.constants");
const EMAIL_REMINDER_DEFINITIONS = [
    { key: '24h', type: notification_constants_1.TYPE_JOB_REMINDER_24H, offsetMs: 24 * 60 * 60 * 1000 },
    { key: '1h', type: notification_constants_1.TYPE_JOB_REMINDER_1H, offsetMs: 60 * 60 * 1000 },
];
let NotificationService = class NotificationService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async scheduleJobReminders(companyId, jobId) {
        const job = (await this.prisma.job.findFirst({
            where: {
                id: jobId,
                companyId,
            },
            include: {
                company: true,
                client: true,
                worker: true,
            },
        }));
        if (!job) {
            throw new common_1.NotFoundException('Job not found');
        }
        await this.cancelJobReminders(companyId, jobId, 'Reminder schedule refreshed');
        if (!this.shouldScheduleEmailReminders(job.status, job.client.email)) {
            return [];
        }
        const notifications = [];
        const basePayload = {
            jobId: job.id,
            clientId: job.clientId,
            workerId: job.workerId ?? null,
            manageUrl: null,
        };
        const recipient = job.client.email?.trim().toLowerCase() ?? null;
        const now = Date.now();
        for (const reminder of EMAIL_REMINDER_DEFINITIONS) {
            const scheduledAt = new Date(job.startAt.getTime() - reminder.offsetMs);
            if (scheduledAt.getTime() <= now) {
                continue;
            }
            const notification = (await this.prisma.notification.create({
                data: {
                    companyId,
                    type: reminder.type,
                    channel: client_1.NotificationChannel.EMAIL,
                    status: client_1.NotificationStatus.QUEUED,
                    targetType: 'JOB',
                    targetId: job.id,
                    payload: basePayload,
                    recipient,
                    providerMessageId: null,
                    scheduledAt,
                    error: null,
                },
            }));
            try {
                await email_worker_1.emailQueue.add('send', { companyId, notificationId: notification.id }, {
                    jobId: this.buildEmailReminderQueueJobId(job.id, reminder.key),
                    delay: Math.max(0, scheduledAt.getTime() - now),
                    attempts: notification_constants_1.MAX_ATTEMPTS,
                    backoff: {
                        type: 'exponential',
                        delay: 5_000,
                    },
                    removeOnComplete: true,
                    removeOnFail: false,
                });
                notifications.push(this.mapNotification(notification));
            }
            catch (error) {
                const failed = (await this.prisma.notification.update({
                    where: { id: notification.id },
                    data: {
                        status: 'FAILED',
                        error: error?.message?.slice(0, 500) ?? 'Failed to enqueue reminder',
                    },
                }));
                notifications.push(this.mapNotification(failed));
            }
        }
        return notifications;
    }
    async cancelJobReminders(companyId, jobId, reason = 'Reminder canceled') {
        await Promise.all(EMAIL_REMINDER_DEFINITIONS.map((reminder) => email_worker_1.emailQueue
            .remove(this.buildEmailReminderQueueJobId(jobId, reminder.key))
            .catch(() => undefined)));
        await this.prisma.notification.updateMany({
            where: {
                companyId,
                targetType: 'JOB',
                targetId: jobId,
                channel: client_1.NotificationChannel.EMAIL,
                type: {
                    in: EMAIL_REMINDER_DEFINITIONS.map((reminder) => reminder.type),
                },
                status: client_1.NotificationStatus.QUEUED,
            },
            data: {
                status: 'CANCELED',
                error: reason,
                providerMessageId: null,
            },
        });
    }
    async rescheduleJobReminders(companyId, jobId) {
        return this.scheduleJobReminders(companyId, jobId);
    }
    async listJobNotifications(companyId, jobId) {
        const notifications = (await this.prisma.notification.findMany({
            where: {
                companyId,
                targetType: 'JOB',
                targetId: jobId,
                channel: client_1.NotificationChannel.EMAIL,
                type: {
                    in: EMAIL_REMINDER_DEFINITIONS.map((reminder) => reminder.type),
                },
            },
            orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'asc' }],
        }));
        return notifications.map((notification) => this.mapNotification(notification));
    }
    shouldScheduleEmailReminders(status, clientEmail) {
        return (process.env.NOTIFICATIONS_EMAIL_ENABLED === 'true' &&
            status === client_1.JobStatus.SCHEDULED &&
            Boolean(clientEmail?.trim()));
    }
    buildEmailReminderQueueJobId(jobId, reminderKey) {
        return `job:${jobId}:email:${reminderKey}`;
    }
    mapNotification(notification) {
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
};
exports.NotificationService = NotificationService;
exports.NotificationService = NotificationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NotificationService);
//# sourceMappingURL=notification.service.js.map