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
import { hasAnyRole } from '@/common/utils/roles.util';
import { addMinutes, parseISO } from 'date-fns';
import { Prisma, JobStatus } from '@prisma/client';
import { hashRequestBody } from '@/common/utils/idempotency.util';
import {NotificationService} from "@/notifications/notification.service";

@Injectable()
export class JobsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly slots: SlotsService, // needed for create()
        private readonly notifications: NotificationService
    ) {}

    // ---------- READ: list ----------
    async findManyForUser(input: {
        companyId: string;
        roles: string[];
        userSub: string | null;
        dto: ListJobsDto;
    }) {
        const { companyId, roles, userSub, dto } = input;

        const isManager = hasAnyRole(roles, ['admin', 'manager']);
        const isWorker  = hasAnyRole(roles, ['worker']);
        const isClient  = hasAnyRole(roles, ['client']);

        let workerScopeId: string | undefined;
        if (!isManager && isWorker) {
            const w = await this.prisma.worker.findFirst({
                where: { companyId, userId: userSub ?? '' },
                select: { id: true },
            });
            workerScopeId = w?.id;
            if (!workerScopeId) return { items: [], nextCursor: null };
        }

        // NOTE: schema uses startAt/endAt; keep filters on startAt
        const whereBase: Prisma.JobWhereInput = { companyId };

        if (dto.status) whereBase.status = dto.status;
        if (dto.from)   whereBase.startAt = { ...(whereBase.startAt as any), gte: parseISO(dto.from) };
        if (dto.to)     whereBase.startAt = { ...(whereBase.startAt as any), lt:  parseISO(dto.to)   };

        if (isManager) {
            if (dto.workerId)   whereBase.workerId = dto.workerId;
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

        const take   = Math.min(Math.max(dto.take ?? 20, 1), 100);
        const cursor = dto.cursor ? { id: dto.cursor } : undefined;

        const items = await this.prisma.job.findMany({
            where: whereBase,
            orderBy: { startAt: 'desc' },
            take: take + 1,
            cursor,
            skip: cursor ? 1 : 0,
        });

        const hasMore   = items.length > take;
        const trimmed   = hasMore ? items.slice(0, take) : items;
        const nextCursor = hasMore ? trimmed[trimmed.length - 1].id : null;

        return { items: trimmed, nextCursor };
    }

    // ---------- READ: one ----------
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
        const isWorker  = hasAnyRole(roles, ['worker']);
        const isClient  = hasAnyRole(roles, ['client']);

        if (isManager) return job;

        if (isWorker) {
            const w = await this.prisma.worker.findFirst({
                where: { companyId, userId: userSub ?? '' },
                select: { id: true },
            });
            if (w && w.id === job.workerId) return job;
            throw new ForbiddenException();
        }

        // Clients: restrict as needed (e.g., client owns job’s clientId)
        // For now, deny:
        if (isClient) throw new ForbiddenException();

        throw new ForbiddenException();
    }

    // ---------- WRITE: create ----------
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
            // Idempotency
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

            // Slot check
            const allowed = await this.slots.isSlotBookable({
                workerId: dto.workerId,
                serviceId: dto.serviceId,
                companyId: dto.companyId,
                start,
                end,
            });
            if (!allowed) throw new UnprocessableEntityException('Slot is no longer available');

            // Overlap guard
            const conflicting = await tx.job.findFirst({
                where: {
                    companyId: dto.companyId,
                    workerId: dto.workerId,
                    status: { in: [JobStatus.SCHEDULED, JobStatus.IN_PROGRESS] },
                    NOT: [{ endAt: { lte: start } }, { startAt: { gte: end } }],
                },
                select: { id: true },
            });
            if (conflicting) throw new ConflictException('Overlapping booking');

            // Client resolve/create
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
            // Create job
            const job = await tx.job.create({
                data: {
                    companyId: dto.companyId,
                    clientId,
                    workerId: dto.workerId ?? null,
                    startAt: start,
                    endAt: end,
                    status: JobStatus.SCHEDULED, // or DRAFT if you prefer two-step
                    subtotalCents: subtotal,
                    taxCents: tax,
                    totalCents: total,
                    paidCents: 0,
                    balanceCents: total,
                    currency: service.currency ?? "CAD",
                },
            });

            // Attach service as line item
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

            // Idempotency link
            if (idempotencyKey) {
                await tx.idempotencyKey.update({
                    where: { key: idempotencyKey },
                    data: { jobId: job.id },
                });
            }
            return job;
        },

            { isolationLevel: 'Serializable' });
    }
    async confirmJob(companyId: string, jobId: string) {
        // 1) Update job status
        const job = await this.prisma.job.update({
            where: { id: jobId },
            data: { status: JobStatus.SCHEDULED },
        });

        // 2) enqueue reminders
        await this.notifications.enqueueJobReminders(companyId, jobId);

        return job;
    }
}
