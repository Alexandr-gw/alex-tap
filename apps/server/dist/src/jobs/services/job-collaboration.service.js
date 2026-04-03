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
exports.JobCollaborationService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const activity_service_1 = require("../../activity/activity.service");
const notification_service_1 = require("../../notifications/notification.service");
const payments_service_1 = require("../../payments/payments.service");
const prisma_service_1 = require("../../prisma/prisma.service");
const job_access_service_1 = require("./job-access.service");
const job_draft_service_1 = require("./job-draft.service");
const job_query_service_1 = require("./job-query.service");
let JobCollaborationService = class JobCollaborationService {
    prisma;
    payments;
    notifications;
    activity;
    access;
    draft;
    query;
    constructor(prisma, payments, notifications, activity, access, draft, query) {
        this.prisma = prisma;
        this.payments = payments;
        this.notifications = notifications;
        this.activity = activity;
        this.access = access;
        this.draft = draft;
        this.query = query;
    }
    async sendConfirmation(input) {
        const access = await this.access.resolveAccess(input.companyId, input.roles, input.userSub);
        const job = await this.query.findDetailedJobOrThrow(this.prisma, input.companyId, input.id);
        this.access.assertCanAccessJob(job, access);
        return this.notifications.sendJobConfirmation(input.companyId, input.id);
    }
    async createComment(input) {
        const access = await this.access.resolveAccess(input.companyId, input.roles, input.userSub);
        const job = await this.query.findDetailedJobOrThrow(this.prisma, input.companyId, input.id);
        this.access.assertCanAccessJob(job, access);
        const message = input.dto.body.trim();
        if (!message.length) {
            throw new common_1.BadRequestException('Comment body is required');
        }
        const updated = await this.prisma.$transaction(async (tx) => {
            await tx.jobComment.create({
                data: {
                    jobId: input.id,
                    authorUserId: access.userId,
                    message,
                },
            });
            await tx.auditLog.create({
                data: {
                    companyId: input.companyId,
                    actorUserId: access.userId,
                    action: 'JOB_COMMENT_ADDED',
                    entityType: 'JOB',
                    entityId: input.id,
                    changes: { message },
                },
            });
            return this.query.findDetailedJobOrThrow(tx, input.companyId, input.id);
        });
        return this.query.mapJobDetails(updated);
    }
    async updateInternalNotes(input) {
        const access = await this.access.resolveAccess(input.companyId, input.roles, input.userSub);
        const job = await this.query.findDetailedJobOrThrow(this.prisma, input.companyId, input.id);
        this.access.assertCanAccessJob(job, access);
        const internalNotes = this.draft.normalizeOptionalText(input.dto.internalNotes);
        const updated = await this.prisma.$transaction(async (tx) => {
            await tx.job.update({
                where: { id: input.id },
                data: { internalNotes },
            });
            await tx.auditLog.create({
                data: {
                    companyId: input.companyId,
                    actorUserId: access.userId,
                    action: 'JOB_INTERNAL_NOTES_UPDATED',
                    entityType: 'JOB',
                    entityId: input.id,
                    changes: { internalNotes },
                },
            });
            return this.query.findDetailedJobOrThrow(tx, input.companyId, input.id);
        });
        return this.query.mapJobDetails(updated);
    }
    async requestPaymentLink(input) {
        const access = await this.access.resolveAccess(input.companyId, input.roles, input.userSub);
        if (!access.isManager)
            throw new common_1.ForbiddenException();
        const job = await this.query.findDetailedJobOrThrow(this.prisma, input.companyId, input.id);
        if (job.status === client_1.JobStatus.CANCELED) {
            throw new common_1.BadRequestException('Cannot request payment for a canceled job');
        }
        const payment = await this.payments.createCheckoutSession(input.companyId, access.userId, {
            jobId: input.id,
            successUrl: input.dto.successUrl,
            cancelUrl: input.dto.cancelUrl,
            idempotencyKey: input.dto.idempotencyKey,
        });
        await this.prisma.auditLog.create({
            data: {
                companyId: input.companyId,
                actorUserId: access.userId,
                action: 'JOB_PAYMENT_REQUESTED',
                entityType: 'JOB',
                entityId: input.id,
                changes: {
                    sessionId: payment.sessionId,
                    amountCents: job.balanceCents,
                },
            },
        });
        return {
            jobId: input.id,
            sessionId: payment.sessionId,
            url: payment.url,
            amountCents: job.balanceCents,
            currency: job.currency,
        };
    }
};
exports.JobCollaborationService = JobCollaborationService;
exports.JobCollaborationService = JobCollaborationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        payments_service_1.PaymentsService,
        notification_service_1.NotificationService,
        activity_service_1.ActivityService,
        job_access_service_1.JobAccessService,
        job_draft_service_1.JobDraftService,
        job_query_service_1.JobQueryService])
], JobCollaborationService);
//# sourceMappingURL=job-collaboration.service.js.map