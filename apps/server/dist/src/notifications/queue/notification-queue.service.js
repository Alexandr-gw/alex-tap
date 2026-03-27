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
exports.NotificationQueueService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("bullmq");
const app_logger_service_1 = require("../../observability/app-logger.service");
const request_context_service_1 = require("../../observability/request-context.service");
const notification_constants_1 = require("../notification.constants");
const redis_config_1 = require("./redis.config");
let NotificationQueueService = class NotificationQueueService {
    logger;
    requestContext;
    connection = (0, redis_config_1.getRedisConnection)();
    emailQueue = new bullmq_1.Queue(notification_constants_1.QUEUE_EMAIL, {
        connection: this.connection,
    });
    emailDlq = new bullmq_1.Queue(notification_constants_1.QUEUE_EMAIL_DLQ, {
        connection: this.connection,
    });
    smsQueue = new bullmq_1.Queue(notification_constants_1.QUEUE_SMS, {
        connection: this.connection,
    });
    smsDlq = new bullmq_1.Queue(notification_constants_1.QUEUE_SMS_DLQ, {
        connection: this.connection,
    });
    constructor(logger, requestContext) {
        this.logger = logger;
        this.requestContext = requestContext;
    }
    async scheduleEmailReminder(input) {
        const queueJobId = this.buildEmailReminderQueueJobId(input.jobId, input.reminderKey);
        const delay = Math.max(0, input.scheduledAt.getTime() - Date.now());
        await this.emailQueue.add('send', {
            companyId: input.companyId,
            notificationId: input.notificationId,
            trace: this.requestContext.createAsyncTraceLink({
                companyId: input.companyId,
            }),
        }, {
            jobId: queueJobId,
            delay,
            attempts: notification_constants_1.MAX_ATTEMPTS,
            backoff: {
                type: 'exponential',
                delay: 5_000,
            },
            removeOnComplete: true,
            removeOnFail: false,
        });
        this.logger.debugEvent('notification.email.queued', {
            queueJobId,
            notificationId: input.notificationId,
            scheduledAt: input.scheduledAt.toISOString(),
        });
    }
    async cancelEmailReminder(jobId, reminderKey) {
        const queueJobId = this.buildEmailReminderQueueJobId(jobId, reminderKey);
        await this.emailQueue.remove(queueJobId).catch(() => undefined);
        this.logger.info('notification.email.canceled', {
            queueJobId,
            jobId,
            reminderKey,
        });
    }
    async moveEmailToDlq(payload) {
        await this.emailDlq.add('dead', payload, {
            removeOnComplete: true,
            removeOnFail: true,
        });
        this.logger.warnEvent('notification.email.moved_to_dlq', {
            notificationId: payload.notificationId,
            trace: payload.trace,
        });
    }
    async moveSmsToDlq(payload) {
        await this.smsDlq.add('dead', payload, {
            removeOnComplete: true,
            removeOnFail: true,
        });
        this.logger.warnEvent('notification.sms.moved_to_dlq', {
            notificationId: payload.notificationId,
            trace: payload.trace,
        });
    }
    getConnection() {
        return this.connection;
    }
    async getHealthSnapshot() {
        try {
            const client = await this.emailQueue.client;
            await client.ping();
            const [email, emailDlq, sms, smsDlq] = await Promise.all([
                this.emailQueue.getJobCounts('waiting', 'active', 'delayed', 'failed', 'completed'),
                this.emailDlq.getJobCounts('waiting', 'active', 'delayed', 'failed', 'completed'),
                this.smsQueue.getJobCounts('waiting', 'active', 'delayed', 'failed', 'completed'),
                this.smsDlq.getJobCounts('waiting', 'active', 'delayed', 'failed', 'completed'),
            ]);
            return {
                redis: 'up',
                email,
                emailDlq,
                sms,
                smsDlq,
            };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown Redis error';
            return {
                redis: 'down',
                error: message,
                email: null,
                emailDlq: null,
                sms: null,
                smsDlq: null,
            };
        }
    }
    async onModuleDestroy() {
        await Promise.allSettled([
            this.emailQueue.close(),
            this.emailDlq.close(),
            this.smsQueue.close(),
            this.smsDlq.close(),
        ]);
    }
    buildEmailReminderQueueJobId(jobId, reminderKey) {
        return `job:${jobId}:email:${reminderKey}`;
    }
};
exports.NotificationQueueService = NotificationQueueService;
exports.NotificationQueueService = NotificationQueueService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [app_logger_service_1.AppLogger,
        request_context_service_1.RequestContextService])
], NotificationQueueService);
//# sourceMappingURL=notification-queue.service.js.map