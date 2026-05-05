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
exports.JobQueryService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const date_fns_1 = require("date-fns");
const roles_util_1 = require("../../common/utils/roles.util");
const activity_service_1 = require("../../activity/activity.service");
const notification_service_1 = require("../../notifications/notification.service");
const prisma_service_1 = require("../../prisma/prisma.service");
const job_access_service_1 = require("./job-access.service");
const job_draft_service_1 = require("./job-draft.service");
let JobQueryService = class JobQueryService {
    prisma;
    access;
    draft;
    notifications;
    activity;
    constructor(prisma, access, draft, notifications, activity) {
        this.prisma = prisma;
        this.access = access;
        this.draft = draft;
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
            if (!workerScopeId) {
                return { items: [], nextCursor: null, timezone: null };
            }
        }
        const whereBase = { companyId, deletedAt: null };
        if (dto.status)
            whereBase.status = dto.status;
        if (dto.from && dto.to) {
            whereBase.AND = [
                { startAt: { lt: (0, date_fns_1.parseISO)(dto.to) } },
                { endAt: { gt: (0, date_fns_1.parseISO)(dto.from) } },
            ];
        }
        else {
            if (dto.from) {
                whereBase.startAt = {
                    ...whereBase.startAt,
                    gte: (0, date_fns_1.parseISO)(dto.from),
                };
            }
            if (dto.to) {
                whereBase.startAt = {
                    ...whereBase.startAt,
                    lt: (0, date_fns_1.parseISO)(dto.to),
                };
            }
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
        const take = Math.min(Math.max(dto.take ?? (dto.from && dto.to ? 500 : 20), 1), 500);
        const [company, items] = await Promise.all([
            this.prisma.company.findUnique({
                where: { id: companyId },
                select: { timezone: true },
            }),
            this.prisma.job.findMany({
                where: whereBase,
                orderBy: { startAt: 'asc' },
                take: take + 1,
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
    async findDetailedJobOrThrow(db, companyId, id) {
        const job = await db.job.findFirst({
            where: {
                id,
                companyId,
                deletedAt: null,
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
            jobNumber: this.draft.buildJobNumber(job.id),
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
                    status: this.draft.mapVisitStatus(job.status),
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
    async findOneForUser(input) {
        const access = await this.access.resolveAccess(input.companyId, input.roles, input.userSub);
        const job = await this.findDetailedJobOrThrow(this.prisma, input.companyId, input.id);
        this.access.assertCanAccessJob(job, access);
        return this.mapJobDetails(job);
    }
    async listNotifications(input) {
        const access = await this.access.resolveAccess(input.companyId, input.roles, input.userSub);
        const job = await this.findDetailedJobOrThrow(this.prisma, input.companyId, input.id);
        this.access.assertCanAccessJob(job, access);
        return this.notifications.getJobNotificationsSummary(input.companyId, input.id);
    }
    async listActivity(input) {
        const access = await this.access.resolveAccess(input.companyId, input.roles, input.userSub);
        const job = await this.findDetailedJobOrThrow(this.prisma, input.companyId, input.id);
        this.access.assertCanAccessJob(job, access);
        return this.activity.listJobActivity(input.companyId, input.id, job.client.id);
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
};
exports.JobQueryService = JobQueryService;
exports.JobQueryService = JobQueryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        job_access_service_1.JobAccessService,
        job_draft_service_1.JobDraftService,
        notification_service_1.NotificationService,
        activity_service_1.ActivityService])
], JobQueryService);
//# sourceMappingURL=job-query.service.js.map