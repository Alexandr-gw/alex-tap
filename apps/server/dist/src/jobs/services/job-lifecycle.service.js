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
exports.JobLifecycleService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const activity_service_1 = require("../../activity/activity.service");
const notification_service_1 = require("../../notifications/notification.service");
const prisma_service_1 = require("../../prisma/prisma.service");
const schedule_service_1 = require("../../schedule/schedule.service");
const job_access_service_1 = require("./job-access.service");
const job_assignment_service_1 = require("./job-assignment.service");
const job_draft_service_1 = require("./job-draft.service");
const job_query_service_1 = require("./job-query.service");
let JobLifecycleService = class JobLifecycleService {
    prisma;
    schedule;
    notifications;
    activity;
    access;
    assignments;
    draft;
    query;
    constructor(prisma, schedule, notifications, activity, access, assignments, draft, query) {
        this.prisma = prisma;
        this.schedule = schedule;
        this.notifications = notifications;
        this.activity = activity;
        this.access = access;
        this.assignments = assignments;
        this.draft = draft;
        this.query = query;
    }
    async updateJob(input) {
        const access = await this.access.resolveAccess(input.companyId, input.roles, input.userSub);
        if (!access.isManager)
            throw new common_1.ForbiddenException();
        const updatedJob = await this.prisma.$transaction(async (tx) => {
            const existing = await this.query.findDetailedJobOrThrow(tx, input.companyId, input.id);
            const data = {};
            const auditChanges = {};
            const nextWorkerIds = await this.assignments.resolveNextWorkerIds(tx, input.companyId, input.dto.workerIds, input.dto.workerId);
            const existingWorkerIds = this.assignments.getAssignedWorkerIds(existing);
            const workerIdsChanged = nextWorkerIds !== null &&
                !this.assignments.areStringArraysEqual(existingWorkerIds, nextWorkerIds);
            const statusChanged = typeof input.dto.status !== 'undefined' &&
                input.dto.status !== existing.status;
            if (typeof input.dto.title === 'string') {
                data.title = this.draft.normalizeOptionalText(input.dto.title);
                auditChanges.title = input.dto.title;
            }
            if (typeof input.dto.description === 'string') {
                data.description = this.draft.normalizeOptionalText(input.dto.description);
                auditChanges.description = input.dto.description;
            }
            if (nextWorkerIds !== null) {
                const nextPrimaryWorkerId = nextWorkerIds[0] ?? null;
                if (nextPrimaryWorkerId !== existing.workerId) {
                    data.worker = nextPrimaryWorkerId
                        ? { connect: { id: nextPrimaryWorkerId } }
                        : { disconnect: true };
                }
                if (workerIdsChanged) {
                    auditChanges.workerIds = {
                        from: existingWorkerIds,
                        to: nextWorkerIds,
                    };
                }
            }
            if (input.dto.lineItems) {
                const normalized = this.draft.normalizeLineItems(input.dto.lineItems);
                const totals = this.draft.calculateTotals(normalized, existing.paidCents);
                data.subtotalCents = totals.subtotalCents;
                data.taxCents = totals.taxCents;
                data.totalCents = totals.totalCents;
                data.balanceCents = totals.balanceCents;
                data.paidAt =
                    totals.balanceCents === 0 && totals.totalCents > 0
                        ? (existing.paidAt ?? new Date())
                        : null;
                auditChanges.lineItems = normalized.map((item) => ({
                    name: item.name,
                    quantity: item.quantity,
                    unitPriceCents: item.unitPriceCents,
                }));
                await tx.jobLineItem.deleteMany({ where: { jobId: existing.id } });
                await tx.jobLineItem.createMany({
                    data: normalized.map((item) => ({
                        jobId: existing.id,
                        serviceId: null,
                        description: item.name,
                        quantity: item.quantity,
                        unitPriceCents: item.unitPriceCents,
                        taxRateBps: 0,
                        totalCents: item.quantity * item.unitPriceCents,
                    })),
                });
            }
            if (statusChanged) {
                if (existing.status === client_1.JobStatus.PENDING_CONFIRMATION &&
                    input.dto.status === client_1.JobStatus.DONE) {
                    throw new common_1.BadRequestException('Pending bookings must be confirmed before they can be completed');
                }
                data.status = input.dto.status;
                auditChanges.status = { from: existing.status, to: input.dto.status };
            }
            if (Object.keys(data).length) {
                await tx.job.update({
                    where: { id: existing.id },
                    data,
                });
            }
            if (workerIdsChanged) {
                await this.assignments.syncJobAssignments(tx, existing.id, nextWorkerIds ?? []);
            }
            if (Object.keys(auditChanges).length) {
                await tx.auditLog.create({
                    data: {
                        companyId: input.companyId,
                        actorUserId: access.userId,
                        action: 'JOB_UPDATED',
                        entityType: 'JOB',
                        entityId: existing.id,
                        changes: auditChanges,
                    },
                });
            }
            if (statusChanged) {
                const actorLabel = access.userName || 'Team member';
                const jobLabel = this.draft.getActivityJobLabel(existing);
                if (input.dto.status === client_1.JobStatus.DONE) {
                    await this.activity.logJobCompleted({
                        db: tx,
                        companyId: input.companyId,
                        jobId: existing.id,
                        clientId: existing.client.id,
                        actorId: access.userId,
                        actorLabel,
                        message: `${jobLabel} was completed by ${actorLabel} for ${existing.client.name}.`,
                        metadata: {
                            clientName: existing.client.name,
                            jobTitle: jobLabel,
                        },
                    });
                }
                if (input.dto.status === client_1.JobStatus.CANCELED ||
                    input.dto.status === client_1.JobStatus.NO_SHOW) {
                    await this.activity.logJobCanceled({
                        db: tx,
                        companyId: input.companyId,
                        jobId: existing.id,
                        clientId: existing.client.id,
                        actorId: access.userId,
                        actorLabel,
                        message: input.dto.status === client_1.JobStatus.NO_SHOW
                            ? `${existing.client.name} was marked as a no-show for ${jobLabel}.`
                            : `${jobLabel} was canceled for ${existing.client.name}.`,
                        metadata: {
                            clientName: existing.client.name,
                            jobTitle: jobLabel,
                            status: input.dto.status,
                        },
                    });
                }
            }
            return this.query.findDetailedJobOrThrow(tx, input.companyId, existing.id);
        });
        if (typeof input.dto.status !== 'undefined') {
            await this.syncJobReminderLifecycle(input.companyId, updatedJob.id, updatedJob.status);
        }
        return this.query.mapJobDetails(updatedJob);
    }
    async completeJob(input) {
        const access = await this.access.resolveAccess(input.companyId, input.roles, input.userSub);
        const job = await this.query.findDetailedJobOrThrow(this.prisma, input.companyId, input.id);
        this.access.assertCanAccessJob(job, access);
        if (job.status === client_1.JobStatus.PENDING_CONFIRMATION) {
            throw new common_1.BadRequestException('Pending bookings must be confirmed before they can be completed');
        }
        const updated = await this.prisma.$transaction(async (tx) => {
            await tx.job.update({
                where: { id: input.id },
                data: { status: client_1.JobStatus.DONE },
            });
            await tx.auditLog.create({
                data: {
                    companyId: input.companyId,
                    actorUserId: access.userId,
                    action: 'JOB_COMPLETED',
                    entityType: 'JOB',
                    entityId: input.id,
                    changes: { status: { from: job.status, to: client_1.JobStatus.DONE } },
                },
            });
            await this.activity.logJobCompleted({
                db: tx,
                companyId: input.companyId,
                jobId: input.id,
                clientId: job.client.id,
                actorId: access.userId,
                actorLabel: access.userName,
                message: `${this.draft.getActivityJobLabel(job)} was completed by ${access.userName || 'Team member'} for ${job.client.name}.`,
                metadata: {
                    clientName: job.client.name,
                    jobTitle: this.draft.getActivityJobLabel(job),
                },
            });
            return this.query.findDetailedJobOrThrow(tx, input.companyId, input.id);
        });
        await this.notifications.cancelJobReminders(input.companyId, updated.id, 'Job completed');
        return this.query.mapJobDetails(updated);
    }
    async cancelJob(input) {
        const access = await this.access.resolveAccess(input.companyId, input.roles, input.userSub);
        if (!access.isManager)
            throw new common_1.ForbiddenException();
        const job = await this.query.findDetailedJobOrThrow(this.prisma, input.companyId, input.id);
        const updated = await this.prisma.$transaction(async (tx) => {
            await tx.job.update({
                where: { id: input.id },
                data: { status: client_1.JobStatus.CANCELED },
            });
            await tx.auditLog.create({
                data: {
                    companyId: input.companyId,
                    actorUserId: access.userId,
                    action: 'JOB_CANCELED',
                    entityType: 'JOB',
                    entityId: input.id,
                    changes: { status: { from: job.status, to: client_1.JobStatus.CANCELED } },
                },
            });
            await this.activity.logJobCanceled({
                db: tx,
                companyId: input.companyId,
                jobId: input.id,
                clientId: job.client.id,
                actorId: access.userId,
                actorLabel: access.userName,
                message: `${this.draft.getActivityJobLabel(job)} was canceled for ${job.client.name}.`,
                metadata: {
                    clientName: job.client.name,
                    jobTitle: this.draft.getActivityJobLabel(job),
                    status: client_1.JobStatus.CANCELED,
                },
            });
            return this.query.findDetailedJobOrThrow(tx, input.companyId, input.id);
        });
        await this.notifications.cancelJobReminders(input.companyId, updated.id, 'Job canceled');
        return this.query.mapJobDetails(updated);
    }
    async reopenJob(input) {
        const access = await this.access.resolveAccess(input.companyId, input.roles, input.userSub);
        if (!access.isManager)
            throw new common_1.ForbiddenException();
        const job = await this.query.findDetailedJobOrThrow(this.prisma, input.companyId, input.id);
        const updated = await this.prisma.$transaction(async (tx) => {
            await tx.job.update({
                where: { id: input.id },
                data: { status: client_1.JobStatus.SCHEDULED },
            });
            await tx.auditLog.create({
                data: {
                    companyId: input.companyId,
                    actorUserId: access.userId,
                    action: 'JOB_REOPENED',
                    entityType: 'JOB',
                    entityId: input.id,
                    changes: { status: { from: job.status, to: client_1.JobStatus.SCHEDULED } },
                },
            });
            return this.query.findDetailedJobOrThrow(tx, input.companyId, input.id);
        });
        await this.notifications.scheduleJobReminders(input.companyId, updated.id);
        return this.query.mapJobDetails(updated);
    }
    async deleteJob(input) {
        const access = await this.access.resolveAccess(input.companyId, input.roles, input.userSub);
        if (!access.isManager)
            throw new common_1.ForbiddenException();
        const job = await this.query.findDetailedJobOrThrow(this.prisma, input.companyId, input.id);
        const deletedAt = new Date();
        await this.prisma.$transaction(async (tx) => {
            await tx.job.update({
                where: { id: input.id },
                data: { deletedAt },
            });
            await tx.auditLog.create({
                data: {
                    companyId: input.companyId,
                    actorUserId: access.userId,
                    action: 'JOB_DELETED',
                    entityType: 'JOB',
                    entityId: input.id,
                    changes: {
                        deletedAt: deletedAt.toISOString(),
                        status: job.status,
                    },
                },
            });
        });
        await this.notifications.cancelJobReminders(input.companyId, input.id, 'Job deleted');
    }
    async listCompanyWorkers(input) {
        return this.schedule.listCompanyWorkers(input);
    }
    async reviewJob(input) {
        return this.schedule.reviewJob(input);
    }
    async confirmJob(companyId, jobId, resolvedByUserId) {
        return this.schedule.confirmJob(companyId, jobId, resolvedByUserId);
    }
    async syncJobReminderLifecycle(companyId, jobId, status) {
        if (status === client_1.JobStatus.CANCELED) {
            await this.notifications.cancelJobReminders(companyId, jobId, 'Job canceled');
            return;
        }
        if (status === client_1.JobStatus.DONE) {
            await this.notifications.cancelJobReminders(companyId, jobId, 'Job completed');
            return;
        }
        await this.notifications.scheduleJobReminders(companyId, jobId);
    }
};
exports.JobLifecycleService = JobLifecycleService;
exports.JobLifecycleService = JobLifecycleService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        schedule_service_1.ScheduleService,
        notification_service_1.NotificationService,
        activity_service_1.ActivityService,
        job_access_service_1.JobAccessService,
        job_assignment_service_1.JobAssignmentService,
        job_draft_service_1.JobDraftService,
        job_query_service_1.JobQueryService])
], JobLifecycleService);
//# sourceMappingURL=job-lifecycle.service.js.map