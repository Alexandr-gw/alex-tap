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
exports.ScheduleService = void 0;
const common_1 = require("@nestjs/common");
const date_fns_1 = require("date-fns");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const notification_service_1 = require("../notifications/notification.service");
const alerts_service_1 = require("../alerts/alerts.service");
const idempotency_util_1 = require("../common/utils/idempotency.util");
let ScheduleService = class ScheduleService {
    prisma;
    notifications;
    alerts;
    constructor(prisma, notifications, alerts) {
        this.prisma = prisma;
        this.notifications = notifications;
        this.alerts = alerts;
    }
    async createScheduledJob(input) {
        const actor = await this.requireManagerActor(input.companyId, input.userSub);
        const start = (0, date_fns_1.parseISO)(input.dto.start);
        if (isNaN(start.getTime()))
            throw new common_1.BadRequestException('Invalid start');
        const service = await this.prisma.service.findUnique({
            where: { id: input.dto.serviceId },
            select: { id: true, companyId: true, name: true, durationMins: true, basePriceCents: true, currency: true },
        });
        if (!service || service.companyId !== input.companyId) {
            throw new common_1.BadRequestException('Invalid service');
        }
        const end = (0, date_fns_1.addMinutes)(start, service.durationMins);
        const targetWorkerId = input.dto.workerId ?? null;
        if (targetWorkerId) {
            const worker = await this.prisma.worker.findFirst({
                where: { id: targetWorkerId, companyId: input.companyId, active: true },
                select: { id: true },
            });
            if (!worker)
                throw new common_1.BadRequestException('Invalid worker');
        }
        const requestHash = (0, idempotency_util_1.hashRequestBody)({
            ...input.dto,
            companyId: input.companyId,
            workerId: targetWorkerId,
            start: start.toISOString(),
            end: end.toISOString(),
        });
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
        return this.prisma.$transaction(async (tx) => {
            if (input.idempotencyKey) {
                const existing = await tx.idempotencyKey.findUnique({ where: { key: input.idempotencyKey } });
                if (!existing) {
                    await tx.idempotencyKey.create({
                        data: {
                            key: input.idempotencyKey,
                            companyId: input.companyId,
                            requestHash,
                            expiresAt,
                        },
                    });
                }
                else {
                    if (existing.requestHash !== requestHash) {
                        throw new common_1.ConflictException('Idempotency key re-used with different payload');
                    }
                    if (existing.jobId) {
                        const existingJob = await tx.job.findUnique({ where: { id: existing.jobId } });
                        if (existingJob)
                            return existingJob;
                    }
                }
            }
            let clientId = null;
            if (input.dto.client?.email) {
                const existingClient = await tx.clientProfile.findFirst({
                    where: { companyId: input.companyId, email: input.dto.client.email },
                    select: { id: true },
                });
                if (existingClient)
                    clientId = existingClient.id;
            }
            if (!clientId) {
                if (!input.dto.client?.name) {
                    throw new common_1.BadRequestException('Client name is required (or provide clientId)');
                }
                const newClient = await tx.clientProfile.create({
                    data: {
                        companyId: input.companyId,
                        name: input.dto.client.name,
                        email: input.dto.client.email ?? null,
                        phone: input.dto.client.phone ?? null,
                    },
                    select: { id: true },
                });
                clientId = newClient.id;
            }
            const subtotal = service.basePriceCents;
            const tax = 0;
            const total = subtotal + tax;
            const job = await tx.job.create({
                data: {
                    companyId: input.companyId,
                    clientId,
                    workerId: targetWorkerId,
                    startAt: start,
                    endAt: end,
                    status: client_1.JobStatus.SCHEDULED,
                    subtotalCents: subtotal,
                    taxCents: tax,
                    totalCents: total,
                    paidCents: 0,
                    balanceCents: total,
                    currency: service.currency ?? 'CAD',
                },
            });
            await tx.jobLineItem.create({
                data: {
                    jobId: job.id,
                    serviceId: service.id,
                    description: service.name,
                    quantity: 1,
                    unitPriceCents: service.basePriceCents,
                    taxRateBps: 0,
                    totalCents: service.basePriceCents,
                },
            });
            await tx.auditLog.create({
                data: {
                    companyId: input.companyId,
                    actorUserId: actor.userId,
                    action: 'JOB_SCHEDULED',
                    entityType: 'JOB',
                    entityId: job.id,
                    changes: {
                        workerId: targetWorkerId,
                        startAt: start.toISOString(),
                        endAt: end.toISOString(),
                    },
                },
            });
            if (input.idempotencyKey) {
                await tx.idempotencyKey.update({
                    where: { key: input.idempotencyKey },
                    data: { jobId: job.id },
                });
            }
            return job;
        }, { isolationLevel: 'Serializable' });
    }
    async listCompanyWorkers(input) {
        await this.requireManagerActor(input.companyId, input.userSub);
        return this.prisma.worker.findMany({
            where: {
                companyId: input.companyId,
                active: true,
            },
            select: {
                id: true,
                displayName: true,
                colorTag: true,
                phone: true,
            },
            orderBy: { displayName: 'asc' },
        });
    }
    async reviewJob(input) {
        const actor = await this.requireManagerActor(input.companyId, input.userSub);
        const nextStart = input.dto.start ? (0, date_fns_1.parseISO)(input.dto.start) : null;
        const nextEnd = input.dto.end ? (0, date_fns_1.parseISO)(input.dto.end) : null;
        if (input.dto.start && isNaN(nextStart.getTime())) {
            throw new common_1.BadRequestException('Invalid start');
        }
        if (input.dto.end && isNaN(nextEnd.getTime())) {
            throw new common_1.BadRequestException('Invalid end');
        }
        const result = await this.prisma.$transaction(async (tx) => {
            const job = await tx.job.findFirst({
                where: {
                    id: input.jobId,
                    companyId: input.companyId,
                },
                include: {
                    lineItems: {
                        include: {
                            service: {
                                select: {
                                    id: true,
                                    durationMins: true,
                                },
                            },
                        },
                        orderBy: { id: 'asc' },
                    },
                },
            });
            if (!job)
                throw new common_1.NotFoundException('Job not found');
            const currentDurationMins = Math.round((job.endAt.getTime() - job.startAt.getTime()) / 60000);
            const serviceLine = job.lineItems.find((item) => item.serviceId && item.service?.durationMins);
            const defaultDurationMins = serviceLine?.service?.durationMins ?? currentDurationMins;
            const workerIdProvided = typeof input.dto.workerId !== 'undefined';
            const targetWorkerId = workerIdProvided ? input.dto.workerId ?? null : job.workerId;
            const targetStart = nextStart ?? job.startAt;
            const targetEnd = nextEnd ?? (nextStart ? (0, date_fns_1.addMinutes)(targetStart, defaultDurationMins) : job.endAt);
            const shouldConfirm = input.dto.confirm === true;
            if (targetEnd.getTime() <= targetStart.getTime()) {
                throw new common_1.BadRequestException('End time must be after start time');
            }
            if (targetWorkerId) {
                const worker = await tx.worker.findFirst({
                    where: {
                        id: targetWorkerId,
                        companyId: input.companyId,
                        active: true,
                    },
                    select: { id: true },
                });
                if (!worker)
                    throw new common_1.BadRequestException('Invalid worker');
            }
            if (shouldConfirm && !job.paidAt) {
                throw new common_1.BadRequestException('Job must be paid before confirmation');
            }
            const updates = {};
            const auditChanges = {};
            if (targetWorkerId !== job.workerId) {
                updates.worker = targetWorkerId
                    ? { connect: { id: targetWorkerId } }
                    : { disconnect: true };
                auditChanges.workerId = { from: job.workerId, to: targetWorkerId };
            }
            if (targetStart.getTime() !== job.startAt.getTime() ||
                targetEnd.getTime() !== job.endAt.getTime()) {
                updates.startAt = targetStart;
                updates.endAt = targetEnd;
                auditChanges.schedule = {
                    from: { startAt: job.startAt.toISOString(), endAt: job.endAt.toISOString() },
                    to: { startAt: targetStart.toISOString(), endAt: targetEnd.toISOString() },
                };
            }
            if (shouldConfirm && job.status !== client_1.JobStatus.SCHEDULED) {
                updates.status = client_1.JobStatus.SCHEDULED;
                auditChanges.status = { from: job.status, to: client_1.JobStatus.SCHEDULED };
            }
            if (Object.keys(updates).length === 0) {
                throw new common_1.BadRequestException('No review changes provided');
            }
            const updatedJob = await tx.job.update({
                where: { id: job.id },
                data: updates,
                include: {
                    client: true,
                    worker: {
                        select: {
                            id: true,
                            displayName: true,
                            colorTag: true,
                            phone: true,
                        },
                    },
                    lineItems: {
                        include: {
                            service: {
                                select: {
                                    id: true,
                                    durationMins: true,
                                    name: true,
                                },
                            },
                        },
                        orderBy: { id: 'asc' },
                    },
                    payments: {
                        orderBy: { createdAt: 'desc' },
                        take: 5,
                    },
                },
            });
            await tx.auditLog.create({
                data: {
                    companyId: input.companyId,
                    actorUserId: actor.userId,
                    action: shouldConfirm ? 'JOB_CONFIRMED' : 'JOB_REVIEW_UPDATED',
                    entityType: 'JOB',
                    entityId: job.id,
                    changes: {
                        ...auditChanges,
                        alertId: input.dto.alertId ?? null,
                    },
                },
            });
            return updatedJob;
        });
        if (input.dto.confirm) {
            await this.notifications.enqueueJobReminders(input.companyId, result.id);
            await this.alerts.resolveBookingReviewAlerts({
                companyId: input.companyId,
                jobId: result.id,
                resolvedByUserId: actor.userId,
            });
        }
        return result;
    }
    async confirmJob(companyId, jobId, resolvedByUserId) {
        const job = await this.prisma.job.update({
            where: { id: jobId },
            data: { status: client_1.JobStatus.SCHEDULED },
        });
        await this.notifications.enqueueJobReminders(companyId, jobId);
        await this.alerts.resolveBookingReviewAlerts({ companyId, jobId, resolvedByUserId });
        return job;
    }
    async requireManagerActor(companyId, userSub) {
        if (!userSub)
            throw new common_1.ForbiddenException();
        const membership = await this.prisma.membership.findFirst({
            where: {
                companyId,
                user: { sub: userSub },
            },
            select: {
                id: true,
                role: true,
                userId: true,
            },
        });
        if (!membership)
            throw new common_1.NotFoundException('Membership not found');
        if (membership.role !== client_1.Role.ADMIN && membership.role !== client_1.Role.MANAGER) {
            throw new common_1.ForbiddenException();
        }
        return membership;
    }
};
exports.ScheduleService = ScheduleService;
exports.ScheduleService = ScheduleService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService,
        alerts_service_1.AlertsService])
], ScheduleService);
//# sourceMappingURL=schedule.service.js.map