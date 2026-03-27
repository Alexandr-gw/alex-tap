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
exports.JobsService = void 0;
const common_1 = require("@nestjs/common");
const date_fns_1 = require("date-fns");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const slots_service_1 = require("../slots/slots.service");
const roles_util_1 = require("../common/utils/roles.util");
const idempotency_util_1 = require("../common/utils/idempotency.util");
const schedule_service_1 = require("../schedule/schedule.service");
const payments_service_1 = require("../payments/payments.service");
const notification_service_1 = require("../notifications/notification.service");
const activity_service_1 = require("../activity/activity.service");
let JobsService = class JobsService {
    prisma;
    slots;
    schedule;
    payments;
    notifications;
    activity;
    constructor(prisma, slots, schedule, payments, notifications, activity) {
        this.prisma = prisma;
        this.slots = slots;
        this.schedule = schedule;
        this.payments = payments;
        this.notifications = notifications;
        this.activity = activity;
    }
    async findManyForUser(input) {
        const { companyId, roles, userSub, dto } = input;
        const isManager = (0, roles_util_1.hasAnyRole)(roles, ['admin', 'manager']);
        const isWorker = (0, roles_util_1.hasAnyRole)(roles, ['worker']);
        const isClient = (0, roles_util_1.hasAnyRole)(roles, ['client']);
        let workerScopeId;
        if (!isManager && isWorker) {
            const worker = await this.prisma.worker.findFirst({
                where: { companyId, user: { sub: userSub ?? '' } },
                select: { id: true },
            });
            workerScopeId = worker?.id;
            if (!workerScopeId)
                return { items: [], nextCursor: null, timezone: null };
        }
        const whereBase = { companyId };
        if (dto.status)
            whereBase.status = dto.status;
        if (dto.from && dto.to) {
            whereBase.AND = [
                { startAt: { lt: (0, date_fns_1.parseISO)(dto.to) } },
                { endAt: { gt: (0, date_fns_1.parseISO)(dto.from) } },
            ];
        }
        else {
            if (dto.from)
                whereBase.startAt = {
                    ...whereBase.startAt,
                    gte: (0, date_fns_1.parseISO)(dto.from),
                };
            if (dto.to)
                whereBase.startAt = {
                    ...whereBase.startAt,
                    lt: (0, date_fns_1.parseISO)(dto.to),
                };
        }
        const appendWorkerScope = (workerId) => {
            const nextAnd = Array.isArray(whereBase.AND)
                ? [...whereBase.AND]
                : whereBase.AND
                    ? [whereBase.AND]
                    : [];
            nextAnd.push({
                OR: [{ workerId }, { assignments: { some: { workerId } } }],
            });
            whereBase.AND = nextAnd;
        };
        if (isManager) {
            if (dto.workerId)
                appendWorkerScope(dto.workerId);
            if (dto.clientEmail)
                whereBase.client = { email: dto.clientEmail };
        }
        else if (isWorker) {
            appendWorkerScope(workerScopeId);
        }
        else if (isClient) {
            if (dto.clientEmail) {
                whereBase.client = { email: dto.clientEmail };
            }
            else {
                return { items: [], nextCursor: null, timezone: null };
            }
        }
        else {
            throw new common_1.ForbiddenException();
        }
        const [company, items] = await Promise.all([
            this.prisma.company.findUnique({
                where: { id: companyId },
                select: { timezone: true },
            }),
            this.prisma.job.findMany({
                where: whereBase,
                orderBy: { startAt: 'asc' },
                take: Math.min(Math.max(dto.take ?? (dto.from && dto.to ? 500 : 20), 1), 500) + 1,
                cursor: dto.cursor ? { id: dto.cursor } : undefined,
                skip: dto.cursor ? 1 : 0,
                include: {
                    client: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            phone: true,
                            address: true,
                        },
                    },
                    worker: {
                        select: {
                            id: true,
                            displayName: true,
                            colorTag: true,
                            phone: true,
                        },
                    },
                    assignments: {
                        include: {
                            worker: {
                                select: {
                                    id: true,
                                    displayName: true,
                                    colorTag: true,
                                    phone: true,
                                },
                            },
                        },
                        orderBy: { createdAt: 'asc' },
                    },
                    lineItems: {
                        include: {
                            service: {
                                select: {
                                    id: true,
                                    name: true,
                                    durationMins: true,
                                },
                            },
                        },
                        orderBy: { id: 'asc' },
                    },
                },
            }),
        ]);
        const take = Math.min(Math.max(dto.take ?? (dto.from && dto.to ? 500 : 20), 1), 500);
        const hasMore = items.length > take;
        const trimmed = hasMore ? items.slice(0, take) : items;
        const nextCursor = hasMore ? trimmed[trimmed.length - 1].id : null;
        return {
            items: trimmed.map((job) => {
                const assignedWorkers = this.mapAssignedWorkers(job);
                return {
                    id: job.id,
                    workerId: job.workerId,
                    workerIds: assignedWorkers.map((worker) => worker.id),
                    startAt: job.startAt.toISOString(),
                    endAt: job.endAt.toISOString(),
                    status: job.status,
                    location: job.location ?? job.client.address,
                    clientName: job.client.name,
                    clientEmail: job.client.email,
                    totalCents: job.totalCents,
                    currency: job.currency,
                    serviceName: job.title ??
                        job.lineItems[0]?.service?.name ??
                        job.lineItems[0]?.description ??
                        'Job',
                    workerName: job.worker?.displayName ?? assignedWorkers[0]?.name ?? null,
                    colorTag: job.worker?.colorTag ?? assignedWorkers[0]?.colorTag ?? null,
                };
            }),
            nextCursor,
            timezone: company?.timezone ?? null,
        };
    }
    async findOneForUser(input) {
        const access = await this.resolveAccess(input.companyId, input.roles, input.userSub);
        const job = await this.findDetailedJobOrThrow(this.prisma, input.companyId, input.id);
        this.assertCanAccessJob(job, access);
        return this.mapJobDetails(job);
    }
    async listNotifications(input) {
        const access = await this.resolveAccess(input.companyId, input.roles, input.userSub);
        const job = await this.findDetailedJobOrThrow(this.prisma, input.companyId, input.id);
        this.assertCanAccessJob(job, access);
        return this.notifications.getJobNotificationsSummary(input.companyId, input.id);
    }
    async listActivity(input) {
        const access = await this.resolveAccess(input.companyId, input.roles, input.userSub);
        const job = await this.findDetailedJobOrThrow(this.prisma, input.companyId, input.id);
        this.assertCanAccessJob(job, access);
        return this.activity.listJobActivity(input.companyId, input.id, job.client.id);
    }
    async sendConfirmation(input) {
        const access = await this.resolveAccess(input.companyId, input.roles, input.userSub);
        const job = await this.findDetailedJobOrThrow(this.prisma, input.companyId, input.id);
        this.assertCanAccessJob(job, access);
        return this.notifications.sendJobConfirmation(input.companyId, input.id);
    }
    async updateJob(input) {
        const access = await this.resolveAccess(input.companyId, input.roles, input.userSub);
        if (!access.isManager)
            throw new common_1.ForbiddenException();
        const updatedJob = await this.prisma.$transaction(async (tx) => {
            const existing = await this.findDetailedJobOrThrow(tx, input.companyId, input.id);
            const data = {};
            const auditChanges = {};
            const nextWorkerIds = await this.resolveNextWorkerIds(tx, input.companyId, input.dto.workerIds, input.dto.workerId);
            const existingWorkerIds = this.getAssignedWorkerIds(existing);
            const workerIdsChanged = nextWorkerIds !== null &&
                !this.areStringArraysEqual(existingWorkerIds, nextWorkerIds);
            const statusChanged = typeof input.dto.status !== 'undefined' &&
                input.dto.status !== existing.status;
            if (typeof input.dto.title === 'string') {
                data.title = this.normalizeOptionalText(input.dto.title);
                auditChanges.title = input.dto.title;
            }
            if (typeof input.dto.description === 'string') {
                data.description = this.normalizeOptionalText(input.dto.description);
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
                const normalized = this.normalizeLineItems(input.dto.lineItems);
                const totals = this.calculateTotals(normalized, existing.paidCents);
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
                await this.syncJobAssignments(tx, existing.id, nextWorkerIds ?? []);
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
                const jobLabel = this.getActivityJobLabel(existing);
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
            return this.findDetailedJobOrThrow(tx, input.companyId, existing.id);
        });
        if (typeof input.dto.status !== 'undefined') {
            await this.syncJobReminderLifecycle(input.companyId, updatedJob.id, updatedJob.status);
        }
        return this.mapJobDetails(updatedJob);
    }
    async completeJob(input) {
        const access = await this.resolveAccess(input.companyId, input.roles, input.userSub);
        const job = await this.findDetailedJobOrThrow(this.prisma, input.companyId, input.id);
        this.assertCanAccessJob(job, access);
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
                message: `${this.getActivityJobLabel(job)} was completed by ${access.userName || 'Team member'} for ${job.client.name}.`,
                metadata: {
                    clientName: job.client.name,
                    jobTitle: this.getActivityJobLabel(job),
                },
            });
            return this.findDetailedJobOrThrow(tx, input.companyId, input.id);
        });
        await this.notifications.cancelJobReminders(input.companyId, updated.id, 'Job completed');
        return this.mapJobDetails(updated);
    }
    async cancelJob(input) {
        const access = await this.resolveAccess(input.companyId, input.roles, input.userSub);
        if (!access.isManager)
            throw new common_1.ForbiddenException();
        const job = await this.findDetailedJobOrThrow(this.prisma, input.companyId, input.id);
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
                message: `${this.getActivityJobLabel(job)} was canceled for ${job.client.name}.`,
                metadata: {
                    clientName: job.client.name,
                    jobTitle: this.getActivityJobLabel(job),
                    status: client_1.JobStatus.CANCELED,
                },
            });
            return this.findDetailedJobOrThrow(tx, input.companyId, input.id);
        });
        await this.notifications.cancelJobReminders(input.companyId, updated.id, 'Job canceled');
        return this.mapJobDetails(updated);
    }
    async reopenJob(input) {
        const access = await this.resolveAccess(input.companyId, input.roles, input.userSub);
        if (!access.isManager)
            throw new common_1.ForbiddenException();
        const job = await this.findDetailedJobOrThrow(this.prisma, input.companyId, input.id);
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
            return this.findDetailedJobOrThrow(tx, input.companyId, input.id);
        });
        await this.notifications.scheduleJobReminders(input.companyId, updated.id);
        return this.mapJobDetails(updated);
    }
    async createComment(input) {
        const access = await this.resolveAccess(input.companyId, input.roles, input.userSub);
        const job = await this.findDetailedJobOrThrow(this.prisma, input.companyId, input.id);
        this.assertCanAccessJob(job, access);
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
            return this.findDetailedJobOrThrow(tx, input.companyId, input.id);
        });
        return this.mapJobDetails(updated);
    }
    async updateInternalNotes(input) {
        const access = await this.resolveAccess(input.companyId, input.roles, input.userSub);
        const job = await this.findDetailedJobOrThrow(this.prisma, input.companyId, input.id);
        this.assertCanAccessJob(job, access);
        const internalNotes = this.normalizeOptionalText(input.dto.internalNotes);
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
            return this.findDetailedJobOrThrow(tx, input.companyId, input.id);
        });
        return this.mapJobDetails(updated);
    }
    async requestPaymentLink(input) {
        const access = await this.resolveAccess(input.companyId, input.roles, input.userSub);
        if (!access.isManager)
            throw new common_1.ForbiddenException();
        const job = await this.findDetailedJobOrThrow(this.prisma, input.companyId, input.id);
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
    async create(input) {
        const { dto, idempotencyKey, roles, userSub, companyId } = input;
        const resolvedCompanyId = companyId ?? dto.companyId;
        if (!resolvedCompanyId)
            throw new common_1.BadRequestException('companyId is required');
        if (companyId && dto.companyId && companyId !== dto.companyId) {
            throw new common_1.BadRequestException('companyId mismatch');
        }
        const isManager = (0, roles_util_1.hasAnyRole)(roles, ['admin', 'manager']);
        const isWorker = (0, roles_util_1.hasAnyRole)(roles, ['worker']);
        if (isManager) {
            return this.createManagerJob({
                companyId: resolvedCompanyId,
                userSub,
                dto: { ...dto, companyId: resolvedCompanyId },
                idempotencyKey,
            });
        }
        if (!isWorker) {
            throw new common_1.ForbiddenException();
        }
        return this.createWorkerJob({
            companyId: resolvedCompanyId,
            userSub,
            dto: { ...dto, companyId: resolvedCompanyId },
            idempotencyKey,
        });
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
    async createManagerJob(input) {
        const access = await this.resolveAccess(input.companyId, ['admin', 'manager'], input.userSub);
        if (!access.isManager)
            throw new common_1.ForbiddenException();
        const start = (0, date_fns_1.parseISO)(input.dto.start);
        if (isNaN(start.getTime()))
            throw new common_1.BadRequestException('Invalid start');
        const service = input.dto.serviceId
            ? await this.findService(input.companyId, input.dto.serviceId)
            : null;
        const end = this.resolveJobEnd(start, input.dto.end, service?.durationMins ?? null);
        const targetWorkerIds = (await this.resolveNextWorkerIds(this.prisma, input.companyId, input.dto.workerIds, input.dto.workerId)) ?? [];
        const targetWorkerId = targetWorkerIds[0] ?? null;
        const normalizedLineItems = this.resolveCreateLineItems(input.dto, service);
        const totals = this.calculateTotals(normalizedLineItems, 0);
        const title = this.resolveJobTitle(input.dto, service, normalizedLineItems);
        const description = this.normalizeOptionalText(input.dto.description ?? input.dto.notes);
        const internalNotes = this.normalizeOptionalText(input.dto.internalNotes);
        const location = this.normalizeOptionalText(input.dto.location ?? input.dto.client?.address);
        const requestHash = (0, idempotency_util_1.hashRequestBody)({
            companyId: input.companyId,
            clientId: input.dto.clientId ?? null,
            client: input.dto.client ?? null,
            workerIds: targetWorkerIds,
            title,
            description,
            internalNotes,
            location,
            start: start.toISOString(),
            end: end.toISOString(),
            lineItems: normalizedLineItems,
        });
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
        const job = await this.prisma.$transaction(async (tx) => {
            if (input.idempotencyKey) {
                const existing = await tx.idempotencyKey.findUnique({
                    where: { key: input.idempotencyKey },
                });
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
                        return this.findDetailedJobOrThrow(tx, input.companyId, existing.jobId);
                    }
                }
            }
            await this.assertNoWorkerConflicts(tx, input.companyId, targetWorkerIds, start, end);
            const clientId = await this.resolveClientId(tx, input.companyId, input.dto);
            const created = await tx.job.create({
                data: {
                    companyId: input.companyId,
                    clientId,
                    workerId: targetWorkerId,
                    title,
                    description,
                    internalNotes,
                    location,
                    startAt: start,
                    endAt: end,
                    status: client_1.JobStatus.SCHEDULED,
                    subtotalCents: totals.subtotalCents,
                    taxCents: totals.taxCents,
                    totalCents: totals.totalCents,
                    paidCents: 0,
                    balanceCents: totals.balanceCents,
                    currency: service?.currency ?? 'CAD',
                },
            });
            await tx.jobLineItem.createMany({
                data: normalizedLineItems.map((item) => ({
                    jobId: created.id,
                    serviceId: item.serviceId ?? null,
                    description: item.name,
                    quantity: item.quantity,
                    unitPriceCents: item.unitPriceCents,
                    taxRateBps: 0,
                    totalCents: item.quantity * item.unitPriceCents,
                })),
            });
            await this.syncJobAssignments(tx, created.id, targetWorkerIds);
            await tx.auditLog.create({
                data: {
                    companyId: input.companyId,
                    actorUserId: access.userId,
                    action: 'JOB_CREATED',
                    entityType: 'JOB',
                    entityId: created.id,
                    changes: {
                        workerIds: targetWorkerIds,
                        startAt: start.toISOString(),
                        endAt: end.toISOString(),
                    },
                },
            });
            await this.activity.logJobCreated({
                db: tx,
                companyId: input.companyId,
                jobId: created.id,
                clientId,
                actorId: access.userId,
                actorLabel: access.userName,
                message: `${created.title || normalizedLineItems[0]?.name || 'Job'} was scheduled for ${input.dto.client?.name ?? 'this client'}.`,
                metadata: {
                    clientName: input.dto.client?.name ?? null,
                    jobTitle: created.title || normalizedLineItems[0]?.name || 'Job',
                },
            });
            if (input.idempotencyKey) {
                await tx.idempotencyKey.update({
                    where: { key: input.idempotencyKey },
                    data: { jobId: created.id },
                });
            }
            return this.findDetailedJobOrThrow(tx, input.companyId, created.id);
        }, { isolationLevel: 'Serializable' });
        await this.notifications.scheduleJobReminders(input.companyId, job.id);
        return this.mapJobDetails(job);
    }
    async createWorkerJob(input) {
        if (!input.dto.serviceId) {
            throw new common_1.BadRequestException('serviceId is required');
        }
        const start = (0, date_fns_1.parseISO)(input.dto.start);
        if (isNaN(start.getTime()))
            throw new common_1.BadRequestException('Invalid start');
        const service = await this.findService(input.companyId, input.dto.serviceId);
        const end = (0, date_fns_1.addMinutes)(start, service.durationMins);
        const requestedWorkerIds = (await this.resolveNextWorkerIds(this.prisma, input.companyId, input.dto.workerIds, input.dto.workerId)) ?? [];
        const actorWorker = await this.prisma.worker.findFirst({
            where: {
                companyId: input.companyId,
                active: true,
                user: { sub: input.userSub ?? '' },
            },
            select: {
                id: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
        if (!actorWorker)
            throw new common_1.ForbiddenException();
        const actorUserId = actorWorker.user?.id ?? null;
        const actorUserLabel = actorWorker.user?.name ?? actorWorker.user?.email ?? 'Team member';
        const targetWorkerIds = requestedWorkerIds.length
            ? requestedWorkerIds
            : [actorWorker.id];
        if (targetWorkerIds.length !== 1 || targetWorkerIds[0] !== actorWorker.id) {
            throw new common_1.ForbiddenException('Workers can only create jobs for themselves');
        }
        const targetWorkerId = actorWorker.id;
        const allowed = await this.slots.isSlotBookable({
            workerId: targetWorkerId,
            serviceId: input.dto.serviceId,
            companyId: input.companyId,
            start,
            end,
        });
        if (!allowed)
            throw new common_1.BadRequestException('Slot is no longer available');
        const requestHash = (0, idempotency_util_1.hashRequestBody)({
            ...input.dto,
            companyId: input.companyId,
            workerIds: targetWorkerIds,
            start: start.toISOString(),
            end: end.toISOString(),
        });
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
        const job = await this.prisma.$transaction(async (tx) => {
            if (input.idempotencyKey) {
                const existing = await tx.idempotencyKey.findUnique({
                    where: { key: input.idempotencyKey },
                });
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
                        return this.findDetailedJobOrThrow(tx, input.companyId, existing.jobId);
                    }
                }
            }
            await this.assertNoWorkerConflicts(tx, input.companyId, targetWorkerIds, start, end);
            const clientId = await this.resolveClientId(tx, input.companyId, input.dto);
            const created = await tx.job.create({
                data: {
                    companyId: input.companyId,
                    clientId,
                    workerId: targetWorkerId,
                    title: this.normalizeOptionalText(input.dto.title) ?? service.name,
                    description: this.normalizeOptionalText(input.dto.description ?? input.dto.notes),
                    internalNotes: this.normalizeOptionalText(input.dto.internalNotes),
                    location: this.normalizeOptionalText(input.dto.location ?? input.dto.client?.address),
                    startAt: start,
                    endAt: end,
                    status: client_1.JobStatus.SCHEDULED,
                    subtotalCents: service.basePriceCents,
                    taxCents: 0,
                    totalCents: service.basePriceCents,
                    paidCents: 0,
                    balanceCents: service.basePriceCents,
                    currency: service.currency ?? 'CAD',
                },
            });
            await tx.jobLineItem.create({
                data: {
                    jobId: created.id,
                    serviceId: service.id,
                    description: service.name,
                    quantity: 1,
                    unitPriceCents: service.basePriceCents,
                    taxRateBps: 0,
                    totalCents: service.basePriceCents,
                },
            });
            await this.syncJobAssignments(tx, created.id, targetWorkerIds);
            await this.activity.logJobCreated({
                db: tx,
                companyId: input.companyId,
                jobId: created.id,
                clientId,
                actorId: actorUserId,
                actorLabel: actorUserLabel,
                message: `${service.name} was scheduled for ${input.dto.client?.name ?? 'this client'}.`,
                metadata: {
                    clientName: input.dto.client?.name ?? null,
                    jobTitle: service.name,
                },
            });
            if (input.idempotencyKey) {
                await tx.idempotencyKey.update({
                    where: { key: input.idempotencyKey },
                    data: { jobId: created.id },
                });
            }
            return this.findDetailedJobOrThrow(tx, input.companyId, created.id);
        }, { isolationLevel: 'Serializable' });
        await this.notifications.scheduleJobReminders(input.companyId, job.id);
        return this.mapJobDetails(job);
    }
    getActivityJobLabel(job) {
        return (job.title?.trim() ||
            job.lineItems?.find((item) => item.description?.trim())?.description?.trim() ||
            'Job');
    }
    async resolveAccess(companyId, roles, userSub) {
        if (!userSub)
            throw new common_1.ForbiddenException();
        const [user, membership, worker] = await Promise.all([
            this.prisma.user.findUnique({
                where: { sub: userSub },
                select: { id: true, name: true, email: true },
            }),
            this.prisma.membership.findFirst({
                where: {
                    companyId,
                    user: { sub: userSub },
                },
                select: { role: true },
            }),
            this.prisma.worker.findFirst({
                where: {
                    companyId,
                    active: true,
                    user: { sub: userSub },
                },
                select: { id: true },
            }),
        ]);
        if (!user)
            throw new common_1.ForbiddenException();
        const isManagerRole = (0, roles_util_1.hasAnyRole)(roles, ['admin', 'manager']);
        const isManager = Boolean(isManagerRole &&
            membership &&
            (membership.role === client_1.Role.ADMIN || membership.role === client_1.Role.MANAGER));
        return {
            isManager,
            workerId: worker?.id ?? null,
            userId: user.id,
            userName: user.name ?? user.email ?? 'Team member',
        };
    }
    assertCanAccessJob(job, access) {
        if (access.isManager)
            return;
        const assignedWorkerIds = this.getAssignedWorkerIds(job);
        if (access.workerId && assignedWorkerIds.includes(access.workerId))
            return;
        throw new common_1.ForbiddenException();
    }
    async findDetailedJobOrThrow(db, companyId, id) {
        const job = await db.job.findFirst({
            where: {
                id,
                companyId,
            },
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
                assignments: {
                    include: {
                        worker: {
                            select: {
                                id: true,
                                displayName: true,
                                colorTag: true,
                                phone: true,
                            },
                        },
                    },
                    orderBy: { createdAt: 'asc' },
                },
                lineItems: {
                    include: {
                        service: {
                            select: {
                                id: true,
                                name: true,
                                durationMins: true,
                            },
                        },
                    },
                    orderBy: { id: 'asc' },
                },
                comments: {
                    include: {
                        author: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                    orderBy: { createdAt: 'asc' },
                },
                payments: {
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                },
            },
        });
        if (!job)
            throw new common_1.NotFoundException('Job not found');
        return job;
    }
    mapJobDetails(job) {
        const assignedWorkers = this.mapAssignedWorkers(job).map((worker) => ({
            id: worker.id,
            name: worker.name,
        }));
        return {
            id: job.id,
            jobNumber: this.buildJobNumber(job.id),
            title: job.title ?? job.lineItems[0]?.description ?? 'Job',
            description: job.description,
            status: job.status,
            completed: job.status === client_1.JobStatus.DONE,
            startAt: job.startAt.toISOString(),
            endAt: job.endAt.toISOString(),
            location: job.location ?? job.client.address,
            client: {
                id: job.client.id,
                name: job.client.name,
                email: job.client.email,
                phone: job.client.phone,
                address: job.client.address,
                notes: job.client.notes,
            },
            workers: assignedWorkers,
            visits: [
                {
                    id: job.id,
                    start: job.startAt.toISOString(),
                    end: job.endAt.toISOString(),
                    status: this.mapVisitStatus(job.status),
                    assignedWorkers,
                    completed: job.status === client_1.JobStatus.DONE,
                },
            ],
            lineItems: job.lineItems.map((item) => ({
                id: item.id,
                name: item.description,
                quantity: item.quantity,
                unitPriceCents: item.unitPriceCents,
                totalCents: item.totalCents,
            })),
            comments: job.comments.map((comment) => ({
                id: comment.id,
                body: comment.message,
                authorName: comment.author.name ?? comment.author.email ?? 'Team member',
                createdAt: comment.createdAt.toISOString(),
            })),
            payments: job.payments.map((payment) => ({
                id: payment.id,
                status: payment.status,
                amountCents: payment.amountCents,
                currency: payment.currency,
                createdAt: payment.createdAt.toISOString(),
                receiptUrl: payment.receiptUrl,
                sessionId: payment.stripeSessionId,
            })),
            internalNotes: job.internalNotes,
            createdAt: job.createdAt.toISOString(),
            updatedAt: job.updatedAt.toISOString(),
        };
    }
    mapAssignedWorkers(job) {
        const assignedWorkers = [];
        const seen = new Set();
        const pushWorker = (worker) => {
            if (!worker || seen.has(worker.id))
                return;
            seen.add(worker.id);
            assignedWorkers.push({
                id: worker.id,
                name: worker.displayName,
                colorTag: worker.colorTag ?? null,
                phone: worker.phone ?? null,
            });
        };
        pushWorker(job.worker);
        for (const assignment of job.assignments ?? []) {
            pushWorker(assignment.worker ?? null);
        }
        return assignedWorkers;
    }
    getAssignedWorkerIds(job) {
        const assignedWorkerIds = new Set();
        if (job.workerId) {
            assignedWorkerIds.add(job.workerId);
        }
        for (const assignment of job.assignments ?? []) {
            const assignmentWorkerId = assignment.workerId ?? assignment.worker?.id ?? null;
            if (assignmentWorkerId) {
                assignedWorkerIds.add(assignmentWorkerId);
            }
        }
        return Array.from(assignedWorkerIds);
    }
    async resolveNextWorkerIds(db, companyId, workerIds, workerId) {
        if (typeof workerIds !== 'undefined') {
            return this.validateWorkerIds(db, companyId, workerIds);
        }
        if (typeof workerId !== 'undefined') {
            return this.validateWorkerIds(db, companyId, workerId ? [workerId] : []);
        }
        return null;
    }
    async syncJobAssignments(tx, jobId, workerIds) {
        await tx.jobAssignment.deleteMany({ where: { jobId } });
        if (!workerIds.length) {
            return;
        }
        await tx.jobAssignment.createMany({
            data: workerIds.map((workerId) => ({
                jobId,
                workerId,
            })),
        });
    }
    areStringArraysEqual(left, right) {
        if (left.length !== right.length) {
            return false;
        }
        return left.every((value, index) => value === right[index]);
    }
    async assertNoWorkerConflicts(db, companyId, workerIds, start, end) {
        if (!workerIds.length) {
            return;
        }
        const conflicting = await db.job.findFirst({
            where: {
                companyId,
                status: {
                    in: [
                        client_1.JobStatus.PENDING_CONFIRMATION,
                        client_1.JobStatus.SCHEDULED,
                        client_1.JobStatus.IN_PROGRESS,
                    ],
                },
                NOT: [{ endAt: { lte: start } }, { startAt: { gte: end } }],
                OR: [
                    { workerId: { in: workerIds } },
                    { assignments: { some: { workerId: { in: workerIds } } } },
                ],
            },
            select: { id: true },
        });
        if (conflicting) {
            throw new common_1.ConflictException('Overlapping booking');
        }
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
    buildJobNumber(jobId) {
        return `JOB-${jobId.slice(-6).toUpperCase()}`;
    }
    mapVisitStatus(status) {
        if (status === client_1.JobStatus.CANCELED)
            return 'CANCELED';
        if (status === client_1.JobStatus.DONE)
            return 'COMPLETED';
        return 'SCHEDULED';
    }
    normalizeOptionalText(value) {
        const normalized = value?.trim() ?? '';
        return normalized.length ? normalized : null;
    }
    normalizeLineItems(items) {
        return items.map((item) => {
            const name = item.name.trim();
            if (!name.length) {
                throw new common_1.BadRequestException('Line item name is required');
            }
            if (item.quantity < 1) {
                throw new common_1.BadRequestException('Line item quantity must be at least 1');
            }
            if (item.unitPriceCents < 0) {
                throw new common_1.BadRequestException('Line item unit price cannot be negative');
            }
            return {
                name,
                quantity: item.quantity,
                unitPriceCents: item.unitPriceCents,
            };
        });
    }
    calculateTotals(items, paidCents) {
        const subtotalCents = items.reduce((sum, item) => sum + item.quantity * item.unitPriceCents, 0);
        const taxCents = 0;
        const totalCents = subtotalCents + taxCents;
        const balanceCents = Math.max(totalCents - paidCents, 0);
        return {
            subtotalCents,
            taxCents,
            totalCents,
            balanceCents,
        };
    }
    resolveJobEnd(start, endValue, serviceDurationMins) {
        if (endValue) {
            const parsed = (0, date_fns_1.parseISO)(endValue);
            if (isNaN(parsed.getTime()))
                throw new common_1.BadRequestException('Invalid end');
            if (parsed.getTime() <= start.getTime()) {
                throw new common_1.BadRequestException('End time must be after start time');
            }
            return parsed;
        }
        return (0, date_fns_1.addMinutes)(start, serviceDurationMins ?? 60);
    }
    resolveJobTitle(dto, service, lineItems) {
        return (this.normalizeOptionalText(dto.title) ??
            service?.name ??
            lineItems[0]?.name ??
            'Job');
    }
    resolveCreateLineItems(dto, service) {
        if (dto.lineItems?.length) {
            return this.normalizeLineItems(dto.lineItems).map((item) => ({
                ...item,
                serviceId: null,
            }));
        }
        if (!service) {
            throw new common_1.BadRequestException('Provide a service or at least one line item');
        }
        return [
            {
                name: service.name,
                quantity: 1,
                unitPriceCents: service.basePriceCents,
                serviceId: service.id,
            },
        ];
    }
    async findService(companyId, serviceId) {
        const service = await this.prisma.service.findUnique({
            where: { id: serviceId },
            select: {
                id: true,
                companyId: true,
                name: true,
                durationMins: true,
                basePriceCents: true,
                currency: true,
            },
        });
        if (!service || service.companyId !== companyId) {
            throw new common_1.BadRequestException('Invalid service');
        }
        return service;
    }
    async validateWorkerId(db, companyId, workerId) {
        const workerIds = await this.validateWorkerIds(db, companyId, workerId ? [workerId] : []);
        return workerIds[0] ?? null;
    }
    async validateWorkerIds(db, companyId, workerIds) {
        const uniqueIds = [...new Set(workerIds.filter(Boolean))];
        if (!uniqueIds.length)
            return [];
        const workers = await db.worker.findMany({
            where: {
                id: { in: uniqueIds },
                companyId,
                active: true,
            },
            select: { id: true },
        });
        if (workers.length !== uniqueIds.length) {
            throw new common_1.BadRequestException('Invalid worker');
        }
        return uniqueIds;
    }
    async resolveClientId(tx, companyId, dto) {
        if (dto.clientId) {
            const client = await tx.clientProfile.findFirst({
                where: {
                    id: dto.clientId,
                    companyId,
                    deletedAt: null,
                },
                select: { id: true },
            });
            if (!client)
                throw new common_1.BadRequestException('Invalid client');
            return client.id;
        }
        if (!dto.client) {
            throw new common_1.BadRequestException('clientId or client is required');
        }
        const normalizedName = this.resolveClientName(dto.client.name, dto.client.firstName, dto.client.lastName);
        const email = dto.client.email?.trim().toLowerCase() ?? null;
        const phone = this.normalizeOptionalText(dto.client.phone);
        const address = this.normalizeOptionalText(dto.client.address);
        const notes = this.normalizeOptionalText(dto.client.notes);
        if (email) {
            const existingClient = await tx.clientProfile.findFirst({
                where: { companyId, email },
                select: { id: true },
            });
            if (existingClient)
                return existingClient.id;
        }
        const newClient = await tx.clientProfile.create({
            data: {
                companyId,
                name: normalizedName,
                email,
                phone,
                address,
                notes,
            },
            select: { id: true },
        });
        return newClient.id;
    }
    resolveClientName(name, firstName, lastName) {
        const explicit = this.normalizeOptionalText(name);
        if (explicit)
            return explicit;
        const combined = [
            this.normalizeOptionalText(firstName),
            this.normalizeOptionalText(lastName),
        ]
            .filter(Boolean)
            .join(' ')
            .trim();
        if (!combined.length) {
            throw new common_1.BadRequestException('Client name is required');
        }
        return combined;
    }
};
exports.JobsService = JobsService;
exports.JobsService = JobsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        slots_service_1.SlotsService,
        schedule_service_1.ScheduleService,
        payments_service_1.PaymentsService,
        notification_service_1.NotificationService,
        activity_service_1.ActivityService])
], JobsService);
//# sourceMappingURL=jobs.service.js.map