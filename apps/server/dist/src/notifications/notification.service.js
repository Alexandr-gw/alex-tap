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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const email_provider_1 = require("./providers/email.provider");
const notification_queue_service_1 = require("./queue/notification-queue.service");
const notification_constants_1 = require("./notification.constants");
const jobConfirmation_1 = require("./templates/jobConfirmation");
const public_booking_utils_1 = require("../public-booking/public-booking.utils");
const EMAIL_REMINDER_DEFINITIONS = [
    {
        key: '24h',
        type: notification_constants_1.TYPE_JOB_REMINDER_24H,
        apiType: 'REMINDER_24H',
        label: '24h reminder',
        offsetMs: 24 * 60 * 60 * 1000,
    },
    {
        key: '1h',
        type: notification_constants_1.TYPE_JOB_REMINDER_1H,
        apiType: 'REMINDER_1H',
        label: '1h reminder',
        offsetMs: 60 * 60 * 1000,
    },
];
const JOB_EMAIL_NOTIFICATION_TYPES = [
    notification_constants_1.TYPE_JOB_CONFIRMATION,
    ...EMAIL_REMINDER_DEFINITIONS.map((reminder) => reminder.type),
];
let NotificationService = class NotificationService {
    prisma;
    queues;
    emailProvider;
    constructor(prisma, queues, emailProvider) {
        this.prisma = prisma;
        this.queues = queues;
        this.emailProvider = emailProvider;
    }
    async scheduleJobReminders(companyId, jobId) {
        const job = await this.findJobForNotifications(companyId, jobId);
        await this.cancelJobReminders(companyId, jobId, 'Reminder schedule refreshed');
        if (!this.shouldScheduleEmailReminders(job.status, job.client.email)) {
            return [];
        }
        const notifications = [];
        const manageUrl = await this.getJobManageUrl(companyId, job.id);
        const basePayload = {
            jobId: job.id,
            clientId: job.clientId,
            workerId: job.workerId ?? null,
            manageUrl,
        };
        const recipient = job.client.email?.trim().toLowerCase() ?? null;
        const now = Date.now();
        for (const reminder of EMAIL_REMINDER_DEFINITIONS) {
            const scheduledAt = new Date(job.startAt.getTime() - reminder.offsetMs);
            if (scheduledAt.getTime() <= now) {
                continue;
            }
            const notification = await this.prisma.notification.create({
                data: {
                    companyId,
                    type: reminder.type,
                    channel: client_1.NotificationChannel.EMAIL,
                    status: client_1.NotificationStatus.QUEUED,
                    targetType: client_1.NotificationTargetType.JOB,
                    targetId: job.id,
                    payload: basePayload,
                    recipient,
                    providerMessageId: null,
                    scheduledAt,
                    error: null,
                },
            });
            try {
                await this.queues.scheduleEmailReminder({
                    jobId: job.id,
                    reminderKey: reminder.key,
                    companyId,
                    notificationId: notification.id,
                    scheduledAt,
                });
                notifications.push(this.mapNotification(notification));
            }
            catch (error) {
                const failed = await this.prisma.notification.update({
                    where: { id: notification.id },
                    data: {
                        status: client_1.NotificationStatus.FAILED,
                        error: error?.message?.slice(0, 500) ?? 'Failed to enqueue reminder',
                    },
                });
                notifications.push(this.mapNotification(failed));
            }
        }
        return notifications;
    }
    async cancelJobReminders(companyId, jobId, reason = 'Reminder canceled') {
        await Promise.all(EMAIL_REMINDER_DEFINITIONS.map((reminder) => this.queues.cancelEmailReminder(jobId, reminder.key)));
        await this.prisma.notification.updateMany({
            where: {
                companyId,
                targetType: client_1.NotificationTargetType.JOB,
                targetId: jobId,
                channel: client_1.NotificationChannel.EMAIL,
                type: {
                    in: EMAIL_REMINDER_DEFINITIONS.map((reminder) => reminder.type),
                },
                status: client_1.NotificationStatus.QUEUED,
            },
            data: {
                status: client_1.NotificationStatus.CANCELED,
                error: reason,
                providerMessageId: null,
            },
        });
    }
    async rescheduleJobReminders(companyId, jobId) {
        return this.scheduleJobReminders(companyId, jobId);
    }
    async listJobNotifications(companyId, jobId) {
        const notifications = await this.prisma.notification.findMany({
            where: {
                companyId,
                targetType: client_1.NotificationTargetType.JOB,
                targetId: jobId,
                channel: client_1.NotificationChannel.EMAIL,
                type: {
                    in: EMAIL_REMINDER_DEFINITIONS.map((reminder) => reminder.type),
                },
            },
            orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'asc' }],
        });
        return notifications.map((notification) => this.mapNotification(notification));
    }
    async getJobNotificationsSummary(companyId, jobId) {
        const [job, notifications] = await Promise.all([
            this.findJobForNotifications(companyId, jobId),
            this.prisma.notification.findMany({
                where: {
                    companyId,
                    targetType: client_1.NotificationTargetType.JOB,
                    targetId: jobId,
                    channel: client_1.NotificationChannel.EMAIL,
                    type: { in: [...JOB_EMAIL_NOTIFICATION_TYPES] },
                },
                orderBy: [{ createdAt: 'asc' }],
            }),
        ]);
        const clientEmail = job.client.email?.trim().toLowerCase() ?? null;
        const confirmationNotifications = notifications.filter((notification) => notification.type === notification_constants_1.TYPE_JOB_CONFIRMATION);
        return {
            jobId: job.id,
            clientEmail,
            blockedReason: this.getJobCommunicationBlockedReason(job),
            confirmation: this.buildConfirmationSummary(confirmationNotifications),
            reminders: EMAIL_REMINDER_DEFINITIONS.map((reminder) => this.buildReminderSummary(reminder.apiType, reminder.offsetMs, job, notifications.filter((notification) => notification.type === reminder.type))),
        };
    }
    async sendJobConfirmation(companyId, jobId) {
        const job = await this.findJobForNotifications(companyId, jobId);
        const blockedReason = this.getJobCommunicationBlockedReason(job);
        if (blockedReason) {
            throw new common_1.BadRequestException(blockedReason);
        }
        const recipient = job.client.email.trim().toLowerCase();
        const manageUrl = await this.getJobManageUrl(companyId, job.id);
        const notification = await this.prisma.notification.create({
            data: {
                companyId,
                type: notification_constants_1.TYPE_JOB_CONFIRMATION,
                channel: client_1.NotificationChannel.EMAIL,
                status: client_1.NotificationStatus.QUEUED,
                targetType: client_1.NotificationTargetType.JOB,
                targetId: job.id,
                payload: {
                    jobId: job.id,
                    clientId: job.clientId,
                    workerId: job.workerId ?? null,
                    manageUrl,
                },
                recipient,
                providerMessageId: null,
                scheduledAt: null,
                error: null,
            },
        });
        const from = process.env.NOTIFY_FROM_EMAIL?.trim();
        if (!from) {
            const failed = await this.prisma.notification.update({
                where: { id: notification.id },
                data: {
                    status: client_1.NotificationStatus.FAILED,
                    error: 'NOTIFY_FROM_EMAIL not set',
                },
            });
            return {
                success: false,
                message: 'Unable to send confirmation email.',
                confirmation: this.buildConfirmationSummary([failed]),
            };
        }
        const result = await this.emailProvider.sendEmail({
            to: recipient,
            from,
            ...this.buildJobConfirmationEmail(job),
        });
        const updated = await this.prisma.notification.update({
            where: { id: notification.id },
            data: result.ok
                ? {
                    status: client_1.NotificationStatus.SENT,
                    sentAt: new Date(),
                    recipient,
                    providerMessageId: result.messageId ?? null,
                    error: null,
                }
                : {
                    status: client_1.NotificationStatus.FAILED,
                    error: result.errorMessage ?? 'Unable to send confirmation email',
                },
        });
        return {
            success: updated.status === client_1.NotificationStatus.SENT,
            message: updated.status === client_1.NotificationStatus.SENT
                ? 'Confirmation email sent.'
                : 'Unable to send confirmation email.',
            confirmation: this.buildConfirmationSummary([updated]),
        };
    }
    async getLatestClientCommunication(companyId, clientId) {
        const jobs = await this.prisma.job.findMany({
            where: {
                companyId,
                clientId,
                deletedAt: null,
            },
            select: { id: true },
        });
        const jobIds = jobs.map((job) => job.id);
        if (!jobIds.length) {
            return null;
        }
        const notification = await this.prisma.notification.findFirst({
            where: {
                companyId,
                targetType: client_1.NotificationTargetType.JOB,
                targetId: { in: jobIds },
                channel: client_1.NotificationChannel.EMAIL,
                status: client_1.NotificationStatus.SENT,
                type: { in: [...JOB_EMAIL_NOTIFICATION_TYPES] },
            },
            orderBy: [{ sentAt: 'desc' }, { createdAt: 'desc' }],
        });
        return notification ? this.mapClientLastCommunication(notification) : null;
    }
    shouldScheduleEmailReminders(status, clientEmail) {
        return (process.env.NOTIFICATIONS_EMAIL_ENABLED === 'true' &&
            status === client_1.JobStatus.SCHEDULED &&
            Boolean(clientEmail?.trim()));
    }
    async findJobForNotifications(companyId, jobId) {
        const job = await this.prisma.job.findFirst({
            where: {
                id: jobId,
                companyId,
            },
            include: {
                company: true,
                client: true,
                worker: true,
                bookingAccessLink: {
                    select: { token: true },
                },
            },
        });
        if (!job) {
            throw new common_1.NotFoundException('Job not found');
        }
        return job;
    }
    getJobCommunicationBlockedReason(job) {
        if (process.env.NOTIFICATIONS_EMAIL_ENABLED !== 'true') {
            return 'Email notifications are disabled.';
        }
        if (!job.client.email?.trim()) {
            return 'No client email available. Email notifications are unavailable.';
        }
        if (job.status === client_1.JobStatus.CANCELED) {
            return 'Notifications are unavailable for canceled jobs.';
        }
        if (job.status === client_1.JobStatus.DONE) {
            return 'Notifications are unavailable for completed jobs.';
        }
        return null;
    }
    buildConfirmationSummary(notifications) {
        const latest = notifications[notifications.length - 1];
        if (!latest) {
            return {
                status: 'NOT_SENT',
                lastSentAt: null,
                errorMessage: null,
            };
        }
        if (latest.status === client_1.NotificationStatus.SENT) {
            return {
                status: 'SENT',
                lastSentAt: latest.sentAt?.toISOString() ?? null,
                errorMessage: null,
            };
        }
        if (latest.status === client_1.NotificationStatus.FAILED) {
            return {
                status: 'FAILED',
                lastSentAt: latest.sentAt?.toISOString() ?? null,
                errorMessage: latest.error,
            };
        }
        return {
            status: 'NOT_SENT',
            lastSentAt: latest.sentAt?.toISOString() ?? null,
            errorMessage: latest.error,
        };
    }
    buildReminderSummary(type, offsetMs, job, notifications) {
        const latest = notifications[notifications.length - 1];
        const scheduledFor = new Date(job.startAt.getTime() - offsetMs);
        if (!latest) {
            const eligibleToSchedule = process.env.NOTIFICATIONS_EMAIL_ENABLED === 'true' &&
                job.status === client_1.JobStatus.SCHEDULED &&
                Boolean(job.client.email?.trim()) &&
                scheduledFor.getTime() > Date.now();
            return {
                type,
                status: eligibleToSchedule ? 'SCHEDULED' : 'NOT_APPLICABLE',
                scheduledFor: eligibleToSchedule ? scheduledFor.toISOString() : null,
                sentAt: null,
                errorMessage: eligibleToSchedule
                    ? null
                    : this.getReminderNotApplicableReason(job, scheduledFor),
            };
        }
        return {
            type,
            status: this.mapReminderStatus(latest.status),
            scheduledFor: latest.scheduledAt?.toISOString() ??
                (scheduledFor.getTime() > Date.now() ? scheduledFor.toISOString() : null),
            sentAt: latest.sentAt?.toISOString() ?? null,
            errorMessage: latest.error,
        };
    }
    getReminderNotApplicableReason(job, scheduledFor) {
        if (process.env.NOTIFICATIONS_EMAIL_ENABLED !== 'true') {
            return 'Email notifications are disabled.';
        }
        if (!job.client.email?.trim()) {
            return 'Client email missing.';
        }
        if (job.status !== client_1.JobStatus.SCHEDULED) {
            return 'Reminder is only available for scheduled jobs.';
        }
        if (scheduledFor.getTime() <= Date.now()) {
            return 'Reminder window has passed.';
        }
        return null;
    }
    mapReminderStatus(status) {
        switch (status) {
            case client_1.NotificationStatus.QUEUED:
                return 'SCHEDULED';
            case client_1.NotificationStatus.SENT:
                return 'SENT';
            case client_1.NotificationStatus.FAILED:
                return 'FAILED';
            case client_1.NotificationStatus.CANCELED:
                return 'CANCELED';
            case client_1.NotificationStatus.SKIPPED:
            default:
                return 'NOT_APPLICABLE';
        }
    }
    buildJobConfirmationEmail(job) {
        return (0, jobConfirmation_1.jobConfirmation)({
            companyName: job.company.name,
            clientName: job.client.name,
            workerName: job.worker?.displayName ?? null,
            serviceName: job.title,
            startAtISO: job.startAt.toISOString(),
            timezone: job.company.timezone,
            location: job.location ?? job.client.address ?? null,
            manageUrl: job.bookingAccessLink?.token
                ? (0, public_booking_utils_1.buildBookingAccessUrl)(job.bookingAccessLink.token)
                : null,
        });
    }
    async getJobManageUrl(companyId, jobId) {
        const link = await this.prisma.bookingAccessLink.upsert({
            where: { jobId },
            create: {
                companyId,
                jobId,
                token: (0, public_booking_utils_1.createBookingAccessToken)(),
                expiresAt: (0, public_booking_utils_1.getBookingAccessExpiry)(),
            },
            update: {},
        });
        return (0, public_booking_utils_1.buildBookingAccessUrl)(link.token);
    }
    mapClientLastCommunication(notification) {
        if (!notification.sentAt) {
            return null;
        }
        if (notification.type === notification_constants_1.TYPE_JOB_CONFIRMATION) {
            return {
                channel: 'EMAIL',
                type: 'CONFIRMATION',
                label: 'Confirmation email',
                sentAt: notification.sentAt.toISOString(),
                recipient: notification.recipient,
                jobId: notification.targetId,
            };
        }
        const reminder = EMAIL_REMINDER_DEFINITIONS.find((definition) => definition.type === notification.type);
        if (!reminder) {
            return null;
        }
        return {
            channel: 'EMAIL',
            type: reminder.apiType,
            label: reminder.label,
            sentAt: notification.sentAt.toISOString(),
            recipient: notification.recipient,
            jobId: notification.targetId,
        };
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
    __param(2, (0, common_1.Inject)(email_provider_1.EMAIL_PROVIDER)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_queue_service_1.NotificationQueueService, Object])
], NotificationService);
//# sourceMappingURL=notification.service.js.map