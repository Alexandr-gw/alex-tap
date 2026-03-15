import {
    Injectable,
    ForbiddenException,
    NotFoundException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';
import { addMinutes, parseISO } from 'date-fns';
import { Prisma, JobStatus } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { SlotsService } from '@/slots/slots.service';
import { hasAnyRole } from '@/common/utils/roles.util';
import { hashRequestBody } from '@/common/utils/idempotency.util';
import { ListJobsDto } from './dto/list-jobs.dto';
import { CreateJobDto } from './dto/create-job.dto';
import { ReviewJobDto } from './dto/review-job.dto';
import { ScheduleService } from '@/schedule/schedule.service';

@Injectable()
export class JobsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly slots: SlotsService,
        private readonly schedule: ScheduleService,
    ) {}

    async findManyForUser(input: {
        companyId: string;
        roles: string[];
        userSub: string | null;
        dto: ListJobsDto;
    }) {
        const { companyId, roles, userSub, dto } = input;

        const isManager = hasAnyRole(roles, ['admin', 'manager']);
        const isWorker = hasAnyRole(roles, ['worker']);
        const isClient = hasAnyRole(roles, ['client']);

        let workerScopeId: string | undefined;
        if (!isManager && isWorker) {
            const worker = await this.prisma.worker.findFirst({
                where: { companyId, user: { sub: userSub ?? '' } },
                select: { id: true },
            });
            workerScopeId = worker?.id;
            if (!workerScopeId) return { items: [], nextCursor: null, timezone: null };
        }

        const whereBase: Prisma.JobWhereInput = { companyId };

        if (dto.status) whereBase.status = dto.status;
        if (dto.from && dto.to) {
            whereBase.AND = [
                { startAt: { lt: parseISO(dto.to) } },
                { endAt: { gt: parseISO(dto.from) } },
            ];
        } else {
            if (dto.from) whereBase.startAt = { ...(whereBase.startAt as object), gte: parseISO(dto.from) };
            if (dto.to) whereBase.startAt = { ...(whereBase.startAt as object), lt: parseISO(dto.to) };
        }

        if (isManager) {
            if (dto.workerId) whereBase.workerId = dto.workerId;
            if (dto.clientEmail) whereBase.client = { email: dto.clientEmail };
        } else if (isWorker) {
            whereBase.workerId = workerScopeId!;
        } else if (isClient) {
            if (dto.clientEmail) {
                whereBase.client = { email: dto.clientEmail };
            } else {
                return { items: [], nextCursor: null, timezone: null };
            }
        } else {
            throw new ForbiddenException();
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
            items: trimmed.map((job) => ({
                id: job.id,
                workerId: job.workerId,
                startAt: job.startAt.toISOString(),
                endAt: job.endAt.toISOString(),
                status: job.status,
                location: job.location,
                clientName: job.client.name,
                clientEmail: job.client.email,
                serviceName: job.lineItems[0]?.service?.name ?? job.lineItems[0]?.description ?? 'Job',
                workerName: job.worker?.displayName ?? null,
                colorTag: job.worker?.colorTag ?? null,
            })),
            nextCursor,
            timezone: company?.timezone ?? null,
        };
    }

    async findOneForUser(input: {
        companyId: string;
        roles: string[];
        userSub: string | null;
        id: string;
    }) {
        const { companyId, roles, userSub, id } = input;
        const job = await this.prisma.job.findUnique({ where: { id } });
        if (!job || job.companyId !== companyId) throw new NotFoundException();

        const isManager = hasAnyRole(roles, ['admin', 'manager']);
        const isWorker = hasAnyRole(roles, ['worker']);
        const isClient = hasAnyRole(roles, ['client']);

        if (isManager) return job;

        if (isWorker) {
            const worker = await this.prisma.worker.findFirst({
                where: { companyId, user: { sub: userSub ?? '' } },
                select: { id: true },
            });
            if (worker && worker.id === job.workerId) return job;
            throw new ForbiddenException();
        }

        if (isClient) throw new ForbiddenException();
        throw new ForbiddenException();
    }

    async create(input: {
        dto: CreateJobDto;
        idempotencyKey?: string;
        roles: string[];
        userSub: string | null;
        companyId: string | null;
    }) {
        const { dto, idempotencyKey, roles, userSub, companyId } = input;
        const resolvedCompanyId = companyId ?? dto.companyId;
        if (!resolvedCompanyId) throw new BadRequestException('companyId is required');
        if (companyId && dto.companyId && companyId !== dto.companyId) {
            throw new BadRequestException('companyId mismatch');
        }

        const isManager = hasAnyRole(roles, ['admin', 'manager']);
        const isWorker = hasAnyRole(roles, ['worker']);

        if (isManager) {
            return this.schedule.createScheduledJob({
                dto: { ...dto, companyId: resolvedCompanyId },
                idempotencyKey,
                companyId: resolvedCompanyId,
                userSub,
            });
        }

        if (!isWorker) {
            throw new ForbiddenException();
        }

        const start = parseISO(dto.start);
        if (isNaN(start.getTime())) throw new BadRequestException('Invalid start');

        const service = await this.prisma.service.findUnique({
            where: { id: dto.serviceId },
            select: { id: true, companyId: true, name: true, durationMins: true, basePriceCents: true, currency: true },
        });
        if (!service || service.companyId !== resolvedCompanyId) {
            throw new BadRequestException('Invalid service');
        }

        const end = addMinutes(start, service.durationMins);
        let targetWorkerId = dto.workerId ?? null;

        const actorWorker = await this.prisma.worker.findFirst({
            where: { companyId: resolvedCompanyId, active: true, user: { sub: userSub ?? '' } },
            select: { id: true },
        });
        if (!actorWorker) throw new ForbiddenException();
        if (!targetWorkerId) {
            targetWorkerId = actorWorker.id;
        }
        if (targetWorkerId !== actorWorker.id) {
            throw new ForbiddenException('Workers can only create jobs for themselves');
        }

        const allowed = await this.slots.isSlotBookable({
            workerId: targetWorkerId,
            serviceId: dto.serviceId,
            companyId: resolvedCompanyId,
            start,
            end,
        });
        if (!allowed) throw new BadRequestException('Slot is no longer available');

        const requestHash = hashRequestBody({
            ...dto,
            companyId: resolvedCompanyId,
            workerId: targetWorkerId,
            start: start.toISOString(),
            end: end.toISOString(),
        });
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

        return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            if (idempotencyKey) {
                const existing = await tx.idempotencyKey.findUnique({ where: { key: idempotencyKey } });
                if (!existing) {
                    await tx.idempotencyKey.create({
                        data: { key: idempotencyKey, companyId: resolvedCompanyId, requestHash, expiresAt },
                    });
                } else {
                    if (existing.requestHash !== requestHash) {
                        throw new ConflictException('Idempotency key re-used with different payload');
                    }
                    if (existing.jobId) {
                        const existingJob = await tx.job.findUnique({ where: { id: existing.jobId } });
                        if (existingJob) return existingJob;
                    }
                }
            }

            const conflicting = await tx.job.findFirst({
                where: {
                    companyId: resolvedCompanyId,
                    workerId: targetWorkerId,
                    status: { in: [JobStatus.PENDING_CONFIRMATION, JobStatus.SCHEDULED, JobStatus.IN_PROGRESS] },
                    NOT: [{ endAt: { lte: start } }, { startAt: { gte: end } }],
                },
                select: { id: true },
            });
            if (conflicting) throw new ConflictException('Overlapping booking');

            let clientId: string | null = null;
            if (dto.client?.email) {
                const existingClient = await tx.clientProfile.findFirst({
                    where: { companyId: resolvedCompanyId, email: dto.client.email },
                    select: { id: true },
                });
                if (existingClient) clientId = existingClient.id;
            }
            if (!clientId) {
                if (!dto.client?.name) throw new BadRequestException('Client name is required (or provide clientId)');
                const newClient = await tx.clientProfile.create({
                    data: {
                        companyId: resolvedCompanyId,
                        name: dto.client.name,
                        email: dto.client.email ?? null,
                        phone: dto.client.phone ?? null,
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
                    companyId: resolvedCompanyId,
                    clientId,
                    workerId: targetWorkerId,
                    startAt: start,
                    endAt: end,
                    status: JobStatus.SCHEDULED,
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

            if (idempotencyKey) {
                await tx.idempotencyKey.update({
                    where: { key: idempotencyKey },
                    data: { jobId: job.id },
                });
            }

            return job;
        }, { isolationLevel: 'Serializable' });
    }

    async listCompanyWorkers(input: { companyId: string; userSub: string | null }) {
        return this.schedule.listCompanyWorkers(input);
    }

    async reviewJob(input: { companyId: string; userSub: string | null; jobId: string; dto: ReviewJobDto }) {
        return this.schedule.reviewJob(input);
    }

    async confirmJob(companyId: string, jobId: string, resolvedByUserId: string) {
        return this.schedule.confirmJob(companyId, jobId, resolvedByUserId);
    }
}
