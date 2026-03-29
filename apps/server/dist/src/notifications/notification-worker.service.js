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
exports.NotificationWorkerService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const bullmq_1 = require("bullmq");
const prisma_service_1 = require("../prisma/prisma.service");
const app_logger_service_1 = require("../observability/app-logger.service");
const request_context_service_1 = require("../observability/request-context.service");
const email_provider_1 = require("./providers/email.provider");
const twilio_provider_1 = require("./providers/twilio.provider");
const notification_constants_1 = require("./notification.constants");
const jobReminder24h_1 = require("./templates/jobReminder24h");
const jobReminder1h_1 = require("./templates/jobReminder1h");
const notification_queue_service_1 = require("./queue/notification-queue.service");
let NotificationWorkerService = class NotificationWorkerService {
    prisma;
    queues;
    logger;
    requestContext;
    emailProvider;
    smsProvider;
    emailWorker = null;
    smsWorker = null;
    constructor(prisma, queues, logger, requestContext, emailProvider, smsProvider) {
        this.prisma = prisma;
        this.queues = queues;
        this.logger = logger;
        this.requestContext = requestContext;
        this.emailProvider = emailProvider;
        this.smsProvider = smsProvider;
    }
    onModuleInit() {
        const connection = this.queues.getConnection();
        this.emailWorker = new bullmq_1.Worker(notification_constants_1.QUEUE_EMAIL, async (job) => this.runObservedJob('notification.email', notification_constants_1.QUEUE_EMAIL, job, () => this.processEmail(job.data)), {
            connection,
            concurrency: 5,
        });
        this.smsWorker = new bullmq_1.Worker(notification_constants_1.QUEUE_SMS, async (job) => this.runObservedJob('notification.sms', notification_constants_1.QUEUE_SMS, job, () => this.processSms(job.data)), {
            connection,
            concurrency: 5,
        });
        this.attachEventLogging();
        this.logger.info('notification.workers.started');
    }
    async onModuleDestroy() {
        await Promise.allSettled([
            this.emailWorker?.close(),
            this.smsWorker?.close(),
        ]);
    }
    attachEventLogging() {
        this.emailWorker?.on('error', (error) => {
            this.logger.errorEvent('notification.email.worker_error', {
                queueName: notification_constants_1.QUEUE_EMAIL,
            }, error);
        });
        this.emailWorker?.on('completed', (job) => {
            this.logger.info('notification.email.completed', {
                queueJobId: String(job.id ?? ''),
                notificationId: job.data.notificationId,
            });
        });
        this.emailWorker?.on('failed', async (job, err) => {
            if (!job) {
                return;
            }
            this.logger.warnEvent('notification.email.failed', {
                queueJobId: String(job.id ?? ''),
                notificationId: job.data.notificationId,
                attemptsMade: job.attemptsMade,
                maxAttempts: job.opts.attempts ?? notification_constants_1.MAX_ATTEMPTS,
                errorMessage: err?.message ?? 'unknown error',
            });
            if ((job.attemptsMade ?? 0) >= notification_constants_1.MAX_ATTEMPTS) {
                await this.queues.moveEmailToDlq(job.data);
                try {
                    await this.updateNotificationStatus(job.data.notificationId, 'FAILED', {
                        error: err?.message?.slice(0, 500) ?? 'failed',
                    });
                }
                catch (updateError) {
                    this.logger.errorEvent('notification.email.failure_persist_failed', {
                        notificationId: job.data.notificationId,
                    }, updateError);
                }
            }
        });
        this.smsWorker?.on('error', (error) => {
            this.logger.errorEvent('notification.sms.worker_error', {
                queueName: notification_constants_1.QUEUE_SMS,
            }, error);
        });
        this.smsWorker?.on('completed', (job) => {
            this.logger.info('notification.sms.completed', {
                queueJobId: String(job.id ?? ''),
                notificationId: job.data.notificationId,
            });
        });
        this.smsWorker?.on('failed', async (job, err) => {
            if (!job) {
                return;
            }
            this.logger.warnEvent('notification.sms.failed', {
                queueJobId: String(job.id ?? ''),
                notificationId: job.data.notificationId,
                attemptsMade: job.attemptsMade,
                maxAttempts: job.opts.attempts ?? notification_constants_1.MAX_ATTEMPTS,
                errorMessage: err?.message ?? 'unknown error',
            });
            if ((job.attemptsMade ?? 0) >= notification_constants_1.MAX_ATTEMPTS) {
                await this.queues.moveSmsToDlq(job.data);
                try {
                    await this.prisma.notification.update({
                        where: { id: job.data.notificationId },
                        data: { status: 'FAILED', error: err?.message?.slice(0, 500) ?? 'failed' },
                    });
                }
                catch (updateError) {
                    this.logger.errorEvent('notification.sms.failure_persist_failed', {
                        notificationId: job.data.notificationId,
                    }, updateError);
                }
            }
        });
    }
    async runObservedJob(workerName, queueName, job, fn) {
        return this.requestContext.run(this.requestContext.createWorkerContext({
            trace: job.data.trace,
            companyId: job.data.companyId,
            worker: {
                name: workerName,
                queueName,
                queueJobId: job.id ? String(job.id) : null,
                attempt: (job.attemptsMade ?? 0) + 1,
            },
        }), async () => {
            this.logger.info('worker.job.started', {
                workerName,
                queueName,
                queueJobId: job.id ? String(job.id) : null,
                notificationId: job.data.notificationId,
            });
            try {
                const result = await fn();
                this.logger.info('worker.job.succeeded', {
                    workerName,
                    queueName,
                    queueJobId: job.id ? String(job.id) : null,
                    notificationId: job.data.notificationId,
                });
                return result;
            }
            catch (error) {
                this.logger.errorEvent('worker.job.failed', {
                    workerName,
                    queueName,
                    queueJobId: job.id ? String(job.id) : null,
                    notificationId: job.data.notificationId,
                }, error);
                throw error;
            }
        });
    }
    async processEmail(input) {
        const { notificationId, companyId } = input;
        const notification = await this.prisma.notification.findUnique({
            where: { id: notificationId },
        });
        if (!notification ||
            notification.channel !== client_1.NotificationChannel.EMAIL ||
            notification.status !== client_1.NotificationStatus.QUEUED) {
            return;
        }
        const payload = notification.payload;
        const jobId = payload?.jobId;
        if (!jobId) {
            await this.updateNotificationStatus(notificationId, 'FAILED', {
                error: 'payload.jobId missing',
            });
            return;
        }
        const jobEntity = await this.prisma.job.findFirst({
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
            await this.updateNotificationStatus(notificationId, 'SKIPPED', {
                error: 'Job not found',
            });
            return;
        }
        if (jobEntity.status === client_1.JobStatus.CANCELED) {
            await this.updateNotificationStatus(notificationId, 'CANCELED', {
                error: 'Job canceled before reminder send',
            });
            return;
        }
        if (jobEntity.status === client_1.JobStatus.DONE) {
            await this.updateNotificationStatus(notificationId, 'SKIPPED', {
                error: 'Job already completed before reminder send',
            });
            return;
        }
        if (process.env.NOTIFICATIONS_EMAIL_ENABLED !== 'true') {
            await this.updateNotificationStatus(notificationId, 'SKIPPED', {
                error: 'Email notifications disabled',
            });
            return;
        }
        const toEmail = jobEntity.client.email?.trim().toLowerCase() ?? null;
        if (!toEmail) {
            await this.updateNotificationStatus(notificationId, 'CANCELED', {
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
        const result = await this.emailProvider.sendEmail({
            to: toEmail,
            from,
            subject,
            html,
        });
        if (!result.ok) {
            throw new Error(result.errorMessage || 'email send failed');
        }
        await this.updateNotificationStatus(notificationId, 'SENT', {
            sentAt: new Date(),
            recipient: toEmail,
            providerMessageId: result.messageId ?? null,
            error: null,
        });
    }
    async processSms(input) {
        const { notificationId, companyId } = input;
        const notif = await this.prisma.notification.findUnique({ where: { id: notificationId } });
        if (!notif ||
            notif.channel !== client_1.NotificationChannel.SMS ||
            notif.status !== client_1.NotificationStatus.QUEUED) {
            return;
        }
        const payload = notif.payload;
        const jobId = payload?.jobId;
        if (!jobId) {
            throw new Error('payload.jobId missing');
        }
        const [jobEntity, company, client] = await Promise.all([
            this.prisma.job.findUnique({ where: { id: jobId } }),
            this.prisma.company.findUnique({ where: { id: companyId } }),
            payload?.clientId
                ? this.prisma.clientProfile.findUnique({ where: { id: payload.clientId } })
                : null,
        ]);
        if (!jobEntity || !company) {
            throw new Error('job/company not found');
        }
        if (process.env.NOTIFICATIONS_SMS_ENABLED !== 'true') {
            await this.prisma.notification.update({
                where: { id: notificationId },
                data: { status: 'FAILED', error: 'SMS notifications disabled' },
            });
            return;
        }
        const toPhone = client?.phone;
        if (!toPhone) {
            await this.prisma.notification.update({
                where: { id: notificationId },
                data: { status: 'FAILED', error: 'Client phone missing' },
            });
            return;
        }
        const start = jobEntity.startAt.toLocaleString('en-CA', {
            timeZone: company.timezone,
        });
        const body = notif.type === 'job_reminder_24h'
            ? `Reminder: your appointment is tomorrow at ${start} (${company.timezone}).`
            : `Reminder: your appointment starts in 2 hours at ${start} (${company.timezone}).`;
        const from = process.env.TWILIO_FROM_NUMBER || '';
        const res = await this.smsProvider.sendSms({ to: toPhone, from, body });
        if (res.ok) {
            await this.prisma.notification.update({
                where: { id: notificationId },
                data: { status: 'SENT', sentAt: new Date(), error: null },
            });
            return;
        }
        throw new Error(res.errorMessage || 'sms send failed');
    }
    async updateNotificationStatus(notificationId, status, data) {
        await this.prisma.notification.update({
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
};
exports.NotificationWorkerService = NotificationWorkerService;
exports.NotificationWorkerService = NotificationWorkerService = __decorate([
    (0, common_1.Injectable)(),
    __param(4, (0, common_1.Inject)(email_provider_1.EMAIL_PROVIDER)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_queue_service_1.NotificationQueueService,
        app_logger_service_1.AppLogger,
        request_context_service_1.RequestContextService, Object, twilio_provider_1.TwilioSmsProvider])
], NotificationWorkerService);
//# sourceMappingURL=notification-worker.service.js.map