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
const prisma_service_1 = require("../prisma/prisma.service");
const slots_service_1 = require("../slots/slots.service");
const roles_util_1 = require("../common/utils/roles.util");
const date_fns_1 = require("date-fns");
const client_1 = require("@prisma/client");
const idempotency_util_1 = require("../common/utils/idempotency.util");
const notification_service_1 = require("../notifications/notification.service");
let JobsService = class JobsService {
    prisma;
    slots;
    notifications;
    constructor(prisma, slots, notifications) {
        this.prisma = prisma;
        this.slots = slots;
        this.notifications = notifications;
    }
    async findManyForUser(input) {
        const { companyId, roles, userSub, dto } = input;
        const isManager = (0, roles_util_1.hasAnyRole)(roles, ['admin', 'manager']);
        const isWorker = (0, roles_util_1.hasAnyRole)(roles, ['worker']);
        const isClient = (0, roles_util_1.hasAnyRole)(roles, ['client']);
        let workerScopeId;
        if (!isManager && isWorker) {
            const w = await this.prisma.worker.findFirst({
                where: { companyId, userId: userSub ?? '' },
                select: { id: true },
            });
            workerScopeId = w?.id;
            if (!workerScopeId)
                return { items: [], nextCursor: null };
        }
        const whereBase = { companyId };
        if (dto.status)
            whereBase.status = dto.status;
        if (dto.from)
            whereBase.startAt = { ...whereBase.startAt, gte: (0, date_fns_1.parseISO)(dto.from) };
        if (dto.to)
            whereBase.startAt = { ...whereBase.startAt, lt: (0, date_fns_1.parseISO)(dto.to) };
        if (isManager) {
            if (dto.workerId)
                whereBase.workerId = dto.workerId;
            if (dto.clientEmail)
                whereBase.client = { email: dto.clientEmail };
        }
        else if (isWorker) {
            whereBase.workerId = workerScopeId;
        }
        else if (isClient) {
            if (dto.clientEmail) {
                whereBase.client = { email: dto.clientEmail };
            }
            else {
                return { items: [], nextCursor: null };
            }
        }
        else {
            throw new common_1.ForbiddenException();
        }
        const take = Math.min(Math.max(dto.take ?? 20, 1), 100);
        const cursor = dto.cursor ? { id: dto.cursor } : undefined;
        const items = await this.prisma.job.findMany({
            where: whereBase,
            orderBy: { startAt: 'desc' },
            take: take + 1,
            cursor,
            skip: cursor ? 1 : 0,
        });
        const hasMore = items.length > take;
        const trimmed = hasMore ? items.slice(0, take) : items;
        const nextCursor = hasMore ? trimmed[trimmed.length - 1].id : null;
        return { items: trimmed, nextCursor };
    }
    async findOneForUser(input) {
        const { companyId, roles, userSub, id } = input;
        const job = await this.prisma.job.findUnique({ where: { id } });
        if (!job || job.companyId !== companyId)
            throw new common_1.NotFoundException();
        const isManager = (0, roles_util_1.hasAnyRole)(roles, ['admin', 'manager']);
        const isWorker = (0, roles_util_1.hasAnyRole)(roles, ['worker']);
        const isClient = (0, roles_util_1.hasAnyRole)(roles, ['client']);
        if (isManager)
            return job;
        if (isWorker) {
            const w = await this.prisma.worker.findFirst({
                where: { companyId, userId: userSub ?? '' },
                select: { id: true },
            });
            if (w && w.id === job.workerId)
                return job;
            throw new common_1.ForbiddenException();
        }
        if (isClient)
            throw new common_1.ForbiddenException();
        throw new common_1.ForbiddenException();
    }
    async create(dto, idempotencyKey) {
        const start = (0, date_fns_1.parseISO)(dto.start);
        if (isNaN(start.getTime()))
            throw new common_1.BadRequestException('Invalid start');
        const service = await this.prisma.service.findUnique({
            where: { id: dto.serviceId },
            select: { id: true, companyId: true, name: true, durationMins: true, basePriceCents: true, currency: true },
        });
        if (!service || service.companyId !== dto.companyId) {
            throw new common_1.BadRequestException('Invalid service');
        }
        const end = (0, date_fns_1.addMinutes)(start, service.durationMins);
        const requestHash = (0, idempotency_util_1.hashRequestBody)({ ...dto, start: start.toISOString(), end: end.toISOString() });
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
        return this.prisma.$transaction(async (tx) => {
            if (idempotencyKey) {
                const existing = await tx.idempotencyKey.findUnique({ where: { key: idempotencyKey } });
                if (!existing) {
                    await tx.idempotencyKey.create({
                        data: { key: idempotencyKey, companyId: dto.companyId, requestHash, expiresAt },
                    });
                }
                else {
                    if (existing.requestHash !== requestHash)
                        throw new common_1.ConflictException('Idempotency key re-used with different payload');
                    if (existing.jobId) {
                        const job = await tx.job.findUnique({ where: { id: existing.jobId } });
                        if (job)
                            return job;
                    }
                }
            }
            const allowed = await this.slots.isSlotBookable({
                workerId: dto.workerId,
                serviceId: dto.serviceId,
                companyId: dto.companyId,
                start,
                end,
            });
            if (!allowed)
                throw new common_1.UnprocessableEntityException('Slot is no longer available');
            const conflicting = await tx.job.findFirst({
                where: {
                    companyId: dto.companyId,
                    workerId: dto.workerId,
                    status: { in: [client_1.JobStatus.SCHEDULED, client_1.JobStatus.IN_PROGRESS] },
                    NOT: [{ endAt: { lte: start } }, { startAt: { gte: end } }],
                },
                select: { id: true },
            });
            if (conflicting)
                throw new common_1.ConflictException('Overlapping booking');
            let clientId = null;
            if (dto.client?.email) {
                const existingClient = await tx.clientProfile.findFirst({
                    where: { companyId: dto.companyId, email: dto.client.email },
                    select: { id: true },
                });
                if (existingClient)
                    clientId = existingClient.id;
            }
            if (!clientId) {
                if (!dto.client?.name)
                    throw new common_1.BadRequestException('Client name is required (or provide clientId)');
                const newClient = await tx.clientProfile.create({
                    data: {
                        companyId: dto.companyId,
                        name: dto.client.name,
                        email: dto.client.email ?? null,
                        phone: dto.client.phone ?? null,
                    },
                    select: { id: true },
                });
                clientId = newClient.id;
            }
            const job = await tx.job.create({
                data: {
                    companyId: dto.companyId,
                    clientId,
                    workerId: dto.workerId ?? null,
                    startAt: start,
                    endAt: end,
                    status: client_1.JobStatus.SCHEDULED,
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
            if (idempotencyKey) {
                await tx.idempotencyKey.update({
                    where: { key: idempotencyKey },
                    data: { jobId: job.id },
                });
            }
            return job;
        }, { isolationLevel: 'Serializable' });
    }
    async confirmJob(companyId, jobId) {
        const job = await this.prisma.job.update({
            where: { id: jobId },
            data: { status: client_1.JobStatus.SCHEDULED },
        });
        await this.notifications.enqueueJobReminders(companyId, jobId);
        return job;
    }
};
exports.JobsService = JobsService;
exports.JobsService = JobsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        slots_service_1.SlotsService,
        notification_service_1.NotificationService])
], JobsService);
//# sourceMappingURL=jobs.service.js.map