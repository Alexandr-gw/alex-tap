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
const job_access_service_1 = require("./services/job-access.service");
const job_assignment_service_1 = require("./services/job-assignment.service");
const job_collaboration_service_1 = require("./services/job-collaboration.service");
const job_creation_service_1 = require("./services/job-creation.service");
const job_draft_service_1 = require("./services/job-draft.service");
const job_lifecycle_service_1 = require("./services/job-lifecycle.service");
const job_query_service_1 = require("./services/job-query.service");
let JobsService = class JobsService {
    prisma;
    slots;
    schedule;
    payments;
    notifications;
    activity;
    jobAssignments;
    jobAccess;
    jobDraft;
    jobQuery;
    jobCreation;
    jobLifecycle;
    jobCollaboration;
    constructor(prisma, slots, schedule, payments, notifications, activity, jobAccess, jobAssignments, jobDraft, jobQuery, jobCreation, jobLifecycle, jobCollaboration) {
        this.prisma = prisma;
        this.slots = slots;
        this.schedule = schedule;
        this.payments = payments;
        this.notifications = notifications;
        this.activity = activity;
        this.jobAssignments = jobAssignments ?? new job_assignment_service_1.JobAssignmentService();
        this.jobDraft = jobDraft ?? new job_draft_service_1.JobDraftService();
        this.jobAccess =
            jobAccess ?? new job_access_service_1.JobAccessService(this.prisma, this.jobAssignments);
        this.jobQuery =
            jobQuery ??
                new job_query_service_1.JobQueryService(this.prisma, this.jobAccess, this.jobDraft, this.notifications, this.activity);
        this.jobCreation =
            jobCreation ??
                new job_creation_service_1.JobCreationService(this.prisma, this.slots, this.notifications, this.activity, this.jobAccess, this.jobAssignments, this.jobDraft, this.jobQuery);
        this.jobLifecycle =
            jobLifecycle ??
                new job_lifecycle_service_1.JobLifecycleService(this.prisma, this.schedule, this.notifications, this.activity, this.jobAccess, this.jobAssignments, this.jobDraft, this.jobQuery);
        this.jobCollaboration =
            jobCollaboration ??
                new job_collaboration_service_1.JobCollaborationService(this.prisma, this.payments, this.notifications, this.activity, this.jobAccess, this.jobDraft, this.jobQuery);
    }
    async findManyForUser(input) {
        return this.jobQuery.findManyForUser(input);
    }
    async findOneForUser(input) {
        return this.jobQuery.findOneForUser(input);
    }
    async listNotifications(input) {
        return this.jobQuery.listNotifications(input);
    }
    async listActivity(input) {
        return this.jobQuery.listActivity(input);
    }
    async sendConfirmation(input) {
        return this.jobCollaboration.sendConfirmation(input);
    }
    async updateJob(input) {
        return this.jobLifecycle.updateJob(input);
    }
    async completeJob(input) {
        return this.jobLifecycle.completeJob(input);
    }
    async cancelJob(input) {
        return this.jobLifecycle.cancelJob(input);
    }
    async reopenJob(input) {
        return this.jobLifecycle.reopenJob(input);
    }
    async remove(input) {
        return this.jobLifecycle.deleteJob(input);
    }
    async createComment(input) {
        return this.jobCollaboration.createComment(input);
    }
    async updateInternalNotes(input) {
        return this.jobCollaboration.updateInternalNotes(input);
    }
    async requestPaymentLink(input) {
        return this.jobCollaboration.requestPaymentLink(input);
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
        return this.jobLifecycle.listCompanyWorkers(input);
    }
    async reviewJob(input) {
        return this.jobLifecycle.reviewJob(input);
    }
    async confirmJob(companyId, jobId, resolvedByUserId) {
        return this.jobLifecycle.confirmJob(companyId, jobId, resolvedByUserId);
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
        return this.jobDraft.getActivityJobLabel(job);
    }
    async resolveAccess(companyId, roles, userSub) {
        return this.jobAccess.resolveAccess(companyId, roles, userSub);
    }
    assertCanAccessJob(job, access) {
        return this.jobAccess.assertCanAccessJob(job, access);
    }
    async findDetailedJobOrThrow(db, companyId, id) {
        return this.jobQuery.findDetailedJobOrThrow(db, companyId, id);
    }
    mapJobDetails(job) {
        return this.jobQuery.mapJobDetails(job);
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
        return this.jobAssignments.getAssignedWorkerIds(job);
    }
    async resolveNextWorkerIds(db, companyId, workerIds, workerId) {
        return this.jobAssignments.resolveNextWorkerIds(db, companyId, workerIds, workerId);
    }
    async syncJobAssignments(tx, jobId, workerIds) {
        return this.jobAssignments.syncJobAssignments(tx, jobId, workerIds);
    }
    areStringArraysEqual(left, right) {
        return this.jobAssignments.areStringArraysEqual(left, right);
    }
    async assertNoWorkerConflicts(db, companyId, workerIds, start, end) {
        return this.jobAssignments.assertNoWorkerConflicts(db, companyId, workerIds, start, end);
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
        return this.jobDraft.buildJobNumber(jobId);
    }
    mapVisitStatus(status) {
        return this.jobDraft.mapVisitStatus(status);
    }
    normalizeOptionalText(value) {
        return this.jobDraft.normalizeOptionalText(value);
    }
    normalizeLineItems(items) {
        return this.jobDraft.normalizeLineItems(items);
    }
    calculateTotals(items, paidCents) {
        return this.jobDraft.calculateTotals(items, paidCents);
    }
    resolveJobEnd(start, endValue, serviceDurationMins) {
        return this.jobDraft.resolveJobEnd(start, endValue, serviceDurationMins);
    }
    resolveJobTitle(dto, service, lineItems) {
        return this.jobDraft.resolveJobTitle(dto, service, lineItems);
    }
    resolveCreateLineItems(dto, service) {
        return this.jobDraft.resolveCreateLineItems(dto, service);
    }
    async findService(companyId, serviceId) {
        return this.jobCreation.findService(companyId, serviceId);
    }
    async validateWorkerId(db, companyId, workerId) {
        return this.jobAssignments.validateWorkerId(db, companyId, workerId);
    }
    async validateWorkerIds(db, companyId, workerIds) {
        return this.jobAssignments.validateWorkerIds(db, companyId, workerIds);
    }
    async resolveClientId(tx, companyId, dto) {
        return this.jobCreation.resolveClientId(tx, companyId, dto);
    }
    resolveClientName(name, firstName, lastName) {
        return this.jobDraft.resolveClientName(name, firstName, lastName);
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
        activity_service_1.ActivityService,
        job_access_service_1.JobAccessService,
        job_assignment_service_1.JobAssignmentService,
        job_draft_service_1.JobDraftService,
        job_query_service_1.JobQueryService,
        job_creation_service_1.JobCreationService,
        job_lifecycle_service_1.JobLifecycleService,
        job_collaboration_service_1.JobCollaborationService])
], JobsService);
//# sourceMappingURL=jobs.service.js.map