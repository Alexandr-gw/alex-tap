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
exports.JobCreationService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const date_fns_1 = require("date-fns");
const roles_util_1 = require("../../common/utils/roles.util");
const idempotency_util_1 = require("../../common/utils/idempotency.util");
const activity_service_1 = require("../../activity/activity.service");
const notification_service_1 = require("../../notifications/notification.service");
const prisma_service_1 = require("../../prisma/prisma.service");
const slots_service_1 = require("../../slots/slots.service");
const job_access_service_1 = require("./job-access.service");
const job_assignment_service_1 = require("./job-assignment.service");
const job_draft_service_1 = require("./job-draft.service");
const job_query_service_1 = require("./job-query.service");
let JobCreationService = class JobCreationService {
    prisma;
    slots;
    notifications;
    activity;
    access;
    assignments;
    draft;
    query;
    constructor(prisma, slots, notifications, activity, access, assignments, draft, query) {
        this.prisma = prisma;
        this.slots = slots;
        this.notifications = notifications;
        this.activity = activity;
        this.access = access;
        this.assignments = assignments;
        this.draft = draft;
        this.query = query;
    }
    async create(input) {
        const { dto, idempotencyKey, roles, userSub, companyId } = input;
        const resolvedCompanyId = companyId ?? dto.companyId;
        if (!resolvedCompanyId) {
            throw new common_1.BadRequestException('companyId is required');
        }
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
    async createManagerJob(input) {
        const access = await this.access.resolveAccess(input.companyId, ['admin', 'manager'], input.userSub);
        if (!access.isManager)
            throw new common_1.ForbiddenException();
        const start = (0, date_fns_1.parseISO)(input.dto.start);
        if (isNaN(start.getTime()))
            throw new common_1.BadRequestException('Invalid start');
        const service = input.dto.serviceId
            ? await this.findService(input.companyId, input.dto.serviceId)
            : null;
        const end = this.draft.resolveJobEnd(start, input.dto.end, service?.durationMins ?? null);
        const targetWorkerIds = (await this.assignments.resolveNextWorkerIds(this.prisma, input.companyId, input.dto.workerIds, input.dto.workerId)) ?? [];
        const targetWorkerId = targetWorkerIds[0] ?? null;
        const normalizedLineItems = this.draft.resolveCreateLineItems(input.dto, service);
        const totals = this.draft.calculateTotals(normalizedLineItems, 0);
        const title = this.draft.resolveJobTitle(input.dto, service, normalizedLineItems);
        const description = this.draft.normalizeOptionalText(input.dto.description ?? input.dto.notes);
        const internalNotes = this.draft.normalizeOptionalText(input.dto.internalNotes);
        const location = this.draft.normalizeOptionalText(input.dto.location ?? input.dto.client?.address);
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
                        return this.query.findDetailedJobOrThrow(tx, input.companyId, existing.jobId);
                    }
                }
            }
            await this.assignments.assertNoWorkerConflicts(tx, input.companyId, targetWorkerIds, start, end);
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
            await this.assignments.syncJobAssignments(tx, created.id, targetWorkerIds);
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
            return this.query.findDetailedJobOrThrow(tx, input.companyId, created.id);
        }, { isolationLevel: 'Serializable' });
        await this.notifications.scheduleJobReminders(input.companyId, job.id);
        return this.query.mapJobDetails(job);
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
        const requestedWorkerIds = (await this.assignments.resolveNextWorkerIds(this.prisma, input.companyId, input.dto.workerIds, input.dto.workerId)) ?? [];
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
                        return this.query.findDetailedJobOrThrow(tx, input.companyId, existing.jobId);
                    }
                }
            }
            await this.assignments.assertNoWorkerConflicts(tx, input.companyId, targetWorkerIds, start, end);
            const clientId = await this.resolveClientId(tx, input.companyId, input.dto);
            const created = await tx.job.create({
                data: {
                    companyId: input.companyId,
                    clientId,
                    workerId: targetWorkerId,
                    title: this.draft.normalizeOptionalText(input.dto.title) ?? service.name,
                    description: this.draft.normalizeOptionalText(input.dto.description ?? input.dto.notes),
                    internalNotes: this.draft.normalizeOptionalText(input.dto.internalNotes),
                    location: this.draft.normalizeOptionalText(input.dto.location ?? input.dto.client?.address),
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
            await this.assignments.syncJobAssignments(tx, created.id, targetWorkerIds);
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
            return this.query.findDetailedJobOrThrow(tx, input.companyId, created.id);
        }, { isolationLevel: 'Serializable' });
        await this.notifications.scheduleJobReminders(input.companyId, job.id);
        return this.query.mapJobDetails(job);
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
        const normalizedName = this.draft.resolveClientName(dto.client.name, dto.client.firstName, dto.client.lastName);
        const email = dto.client.email?.trim().toLowerCase() ?? null;
        const phone = this.draft.normalizeOptionalText(dto.client.phone);
        const address = this.draft.normalizeOptionalText(dto.client.address);
        const notes = this.draft.normalizeOptionalText(dto.client.notes);
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
};
exports.JobCreationService = JobCreationService;
exports.JobCreationService = JobCreationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        slots_service_1.SlotsService,
        notification_service_1.NotificationService,
        activity_service_1.ActivityService,
        job_access_service_1.JobAccessService,
        job_assignment_service_1.JobAssignmentService,
        job_draft_service_1.JobDraftService,
        job_query_service_1.JobQueryService])
], JobCreationService);
//# sourceMappingURL=job-creation.service.js.map