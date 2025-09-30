import { ConflictException, Injectable, UnprocessableEntityException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';
import { hashRequestBody } from '@/common/utils/idempotency.util';
import { SlotsService } from '@/slots/slots.service';
import { addMinutes, parseISO } from 'date-fns';

@Injectable()
export class JobsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly slots: SlotsService,
    ) {}

    async create(dto: CreateJobDto, idempotencyKey?: string) {
        const start = parseISO(dto.start);
        if (isNaN(start.getTime())) throw new BadRequestException('Invalid start');

        const service = await this.prisma.service.findUnique({ where: { id: dto.serviceId } });
        if (!service || service.companyId !== dto.companyId) throw new BadRequestException('Invalid service');
        const end = addMinutes(start, service.durationMins);

        const requestHash = hashRequestBody({ ...dto, start: start.toISOString(), end: end.toISOString() });
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 1000 * 60 * 30);

        return this.prisma.$transaction(async (tx) => {
            if (idempotencyKey) {
                const existing = await tx.idempotencyKey.findUnique({ where: { key: idempotencyKey } });
                if (!existing) {
                    await tx.idempotencyKey.create({
                        data: {
                            key: idempotencyKey,
                            companyId: dto.companyId,
                            requestHash,
                            expiresAt,
                        },
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
                    status: { in: ['pending', 'confirmed'] },
                    NOT: [
                        { end: { lte: start } },
                        { start: { gte: end } },
                    ],
                },
                select: { id: true },
            });
            if (conflicting) throw new ConflictException('Overlapping booking');

            const job = await tx.job.create({
                data: {
                    companyId: dto.companyId,
                    serviceId: dto.serviceId,
                    workerId: dto.workerId,
                    clientName: dto.client.name,
                    clientEmail: dto.client.email ?? null,
                    clientPhone: dto.client.phone ?? null,
                    notes: dto.notes ?? null,
                    start,
                    end,
                    status: 'pending',
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
}
