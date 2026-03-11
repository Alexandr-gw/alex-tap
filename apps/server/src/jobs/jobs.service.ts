import {
    Injectable,
    ForbiddenException,
    NotFoundException,
    ConflictException,
    UnprocessableEntityException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { SlotsService } from '@/slots/slots.service';
import { ListJobsDto } from './dto/list-jobs.dto';
import { CreateJobDto } from './dto/create-job.dto';
import { ReviewJobDto } from './dto/review-job.dto';
import { hasAnyRole } from '@/common/utils/roles.util';
import { addMinutes, parseISO } from 'date-fns';
import { Prisma, JobStatus, Role } from '@prisma/client';
import { hashRequestBody } from '@/common/utils/idempotency.util';
import { NotificationService } from '@/notifications/notification.service';
import { AlertsService } from '@/alerts/alerts.service';

@Injectable()
export class JobsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly slots: SlotsService,
        private readonly notifications: NotificationService,
        private readonly alerts: AlertsService,
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
            const w = await this.prisma.worker.findFirst({
                where: { companyId, user: { sub: userSub ?? '' } },
                select: { id: true },
            });
            workerScopeId = w?.id;
            if (!workerScopeId) return { items: [], nextCursor: null };
        }

        const whereBase: Prisma.JobWhereInput = { companyId };

        if (dto.status) whereBase.status = dto.status;
        if (dto.from) whereBase.startAt = { ...(whereBase.startAt as object), gte: parseISO(dto.from) };
        if (dto.to) whereBase.startAt = { ...(whereBase.startAt as object), lt: parseISO(dto.to) };

        if (isManager) {
            if (dto.workerId) whereBase.workerId = dto.workerId;
            if (dto.clientEmail) whereBase.client = { email: dto.clientEmail };
        } else if (isWorker) {
            whereBase.workerId = workerScopeId!;
        } else if (isClient) {
            if (dto.clientEmail) {
                whereBase.client = { email: dto.clientEmail };
            } else {
                return { items: [], nextCursor: null };
            }
        } else {
            throw new ForbiddenException();
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
            const w = await this.prisma.worker.findFirst({
                where: { companyId, user: { sub: userSub ?? '' } },
                select: { id: true },
            });
            if (w && w.id === job.workerId) return job;
            throw new ForbiddenException();
        }

        if (isClient) throw new ForbiddenException();

        throw new ForbiddenException();
    }

    async create(dto: CreateJobDto, idempotencyKey?: string) {
        const start = parseISO(dto.start);
        if (isNaN(start.getTime())) throw new BadRequestException('Invalid start');

        const service = await this.prisma.service.findUnique({
            where: { id: dto.serviceId },
            select: { id: true, companyId: true, name: true, durationMins: true, basePriceCents: true, currency: true },
        });
        if (!service || service.companyId !== dto.companyId) {
            throw new BadRequestException('Invalid service');
        }

        const end = addMinutes(start, service.durationMins);

        const requestHash = hashRequestBody({ ...dto, start: start.toISOString(), end: end.toISOString() });
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

        return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            if (idempotencyKey) {
                const existing = await tx.idempotencyKey.findUnique({ where: { key: idempotencyKey } });
                if (!existing) {
                    await tx.idempotencyKey.create({
                        data: { key: idempotencyKey, companyId: dto.companyId, requestHash, expiresAt },
                    });
                } else {
                    if (existing.requestHash !== requestHash) throw new ConflictException('Idempotency key re-used with different payload');
                    if (existing.jobId) {
                        const job = await tx.job.findUnique({ where: { id: existing.jobId } });
                        if (job) return job;
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
            if (!allowed) throw new UnprocessableEntityException('Slot is no longer available');

            const conflicting = await tx.job.findFirst({
                where: {
                    companyId: dto.companyId,
                    workerId: dto.workerId,
                    status: { in: [JobStatus.PENDING_CONFIRMATION, JobStatus.SCHEDULED, JobStatus.IN_PROGRESS] },
                    NOT: [{ endAt: { lte: start } }, { startAt: { gte: end } }],
                },
                select: { id: true },
            });
            if (conflicting) throw new ConflictException('Overlapping booking');

            let clientId: string | null = null;
            if (dto.client?.email) {
                const existingClient = await tx.clientProfile.findFirst({
                    where: { companyId: dto.companyId, email: dto.client.email },
                    select: { id: true },
                });
                if (existingClient) clientId = existingClient.id;
            }
            if (!clientId) {
                if (!dto.client?.name) throw new BadRequestException('Client name is required (or provide clientId)');
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
            const subtotal = service.basePriceCents;
            const tax = 0;
            const total = subtotal + tax;

            const job = await tx.job.create({
                data: {
                    companyId: dto.companyId,
                    clientId,
                    workerId: dto.workerId ?? null,
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

    async reviewJob(input: { companyId: string; userSub: string | null; jobId: string; dto: ReviewJobDto }) {
        const actor = await this.requireManagerActor(input.companyId, input.userSub);
        const nextStart = input.dto.start ? parseISO(input.dto.start) : null;
        if (input.dto.start && isNaN(nextStart!.getTime())) {
            throw new BadRequestException('Invalid start');
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
            if (!job) throw new NotFoundException('Job not found');

            const currentDurationMins = Math.round((job.endAt.getTime() - job.startAt.getTime()) / 60000);
            const serviceLine = job.lineItems.find((item) => item.serviceId && item.service?.durationMins);
            const serviceId = serviceLine?.serviceId ?? null;
            const durationMins = serviceLine?.service?.durationMins ?? currentDurationMins;
            const targetWorkerId = input.dto.workerId ?? job.workerId;
            const targetStart = nextStart ?? job.startAt;
            const targetEnd = addMinutes(targetStart, durationMins);
            const shouldConfirm = input.dto.confirm === true;

            if (!targetWorkerId) {
                throw new BadRequestException('workerId is required');
            }

            const worker = await tx.worker.findFirst({
                where: {
                    id: targetWorkerId,
                    companyId: input.companyId,
                    active: true,
                },
                select: { id: true },
            });
            if (!worker) throw new BadRequestException('Invalid worker');

            if (serviceId) {
                const slotAllowed = await this.slots.isSlotBookable({
                    companyId: input.companyId,
                    workerId: targetWorkerId,
                    serviceId,
                    start: targetStart,
                    end: targetEnd,
                });
                if (!slotAllowed) {
                    throw new UnprocessableEntityException('Selected worker is not available for that slot');
                }
            }

            const conflicting = await tx.job.findFirst({
                where: {
                    id: { not: job.id },
                    companyId: input.companyId,
                    workerId: targetWorkerId,
                    status: { in: [JobStatus.PENDING_CONFIRMATION, JobStatus.SCHEDULED, JobStatus.IN_PROGRESS] },
                    NOT: [{ endAt: { lte: targetStart } }, { startAt: { gte: targetEnd } }],
                },
                select: { id: true },
            });
            if (conflicting) {
                throw new ConflictException('Overlapping booking');
            }

            if (shouldConfirm && !job.paidAt) {
                throw new BadRequestException('Job must be paid before confirmation');
            }

            const updates: Prisma.JobUpdateInput = {};
            const auditChanges: Record<string, unknown> = {};

            if (targetWorkerId !== job.workerId) {
                updates.worker = { connect: { id: targetWorkerId } };
                auditChanges.workerId = { from: job.workerId, to: targetWorkerId };
            }

            if (targetStart.getTime() !== job.startAt.getTime()) {
                updates.startAt = targetStart;
                updates.endAt = targetEnd;
                auditChanges.schedule = {
                    from: { startAt: job.startAt.toISOString(), endAt: job.endAt.toISOString() },
                    to: { startAt: targetStart.toISOString(), endAt: targetEnd.toISOString() },
                };
            }

            if (shouldConfirm && job.status !== JobStatus.SCHEDULED) {
                updates.status = JobStatus.SCHEDULED;
                auditChanges.status = { from: job.status, to: JobStatus.SCHEDULED };
            }

            if (Object.keys(updates).length === 0) {
                throw new BadRequestException('No review changes provided');
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

    async confirmJob(companyId: string, jobId: string, resolvedByUserId: string) {
        const job = await this.prisma.job.update({
            where: { id: jobId },
            data: { status: JobStatus.SCHEDULED },
        });

        await this.notifications.enqueueJobReminders(companyId, jobId);
        await this.alerts.resolveBookingReviewAlerts({ companyId, jobId, resolvedByUserId });

        return job;
    }

    private async requireManagerActor(companyId: string, userSub: string | null) {
        if (!userSub) throw new ForbiddenException();

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

        if (!membership) throw new NotFoundException('Membership not found');
        if (membership.role !== Role.ADMIN && membership.role !== Role.MANAGER) {
            throw new ForbiddenException();
        }

        return membership;
    }
}

