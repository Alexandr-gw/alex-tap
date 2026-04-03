import { BadRequestException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { JobStatus, PaymentStatus, Prisma } from '@prisma/client';
import { addMinutes, parseISO } from 'date-fns';
import { DateTime } from 'luxon';
import { PrismaService } from '@/prisma/prisma.service';
import { SlotsService } from '@/slots/slots.service';
import { PublicCheckoutDto } from './dto/public-checkout.dto';

@Injectable()
export class PublicBookingPersistenceService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly slots: SlotsService,
    ) {}

    async createPublicBookingDraft(dto: PublicCheckoutDto) {
        const start = parseISO(dto.start);
        if (isNaN(start.getTime())) throw new BadRequestException('Invalid start');

        const [company, service] = await Promise.all([
            this.prisma.company.findUnique({
                where: { id: dto.companyId },
                select: { id: true, timezone: true },
            }),
            this.prisma.service.findFirst({
                where: { id: dto.serviceId, companyId: dto.companyId, active: true, deletedAt: null },
                select: {
                    id: true,
                    companyId: true,
                    name: true,
                    durationMins: true,
                    basePriceCents: true,
                    currency: true,
                },
            }),
        ]);

        if (!company) throw new BadRequestException('Invalid company');
        if (!service) throw new BadRequestException('Invalid service/company');

        const end = addMinutes(start, service.durationMins);
        const timezone = company.timezone ?? 'America/Edmonton';
        const bookingDay = DateTime.fromJSDate(start, { zone: 'utc' }).setZone(timezone).toISODate();
        if (!bookingDay) throw new BadRequestException('Invalid start');

        const booking = await this.withSerializableRetry(() =>
            this.prisma.$transaction(
                async (tx: Prisma.TransactionClient) => {
                    await this.acquireCompanyDayBookingLock(tx, dto.companyId, bookingDay);

                    const slotAllowed = await this.slots.isCompanySlotBookable(
                        {
                            companyId: dto.companyId,
                            serviceId: dto.serviceId,
                            start,
                            end,
                        },
                        tx,
                    );
                    if (!slotAllowed) {
                        throw new UnprocessableEntityException('Selected slot is no longer available');
                    }

                    const client = await this.resolveClientProfile(tx, dto);
                    const subtotal = service.basePriceCents;
                    const tax = 0;
                    const total = subtotal + tax;
                    const jobId = await this.upsertPublicJobDraft(tx, {
                        dto,
                        clientId: client.clientId,
                        service: {
                            id: service.id,
                            name: service.name,
                            basePriceCents: service.basePriceCents,
                            currency: service.currency,
                        },
                        start,
                        end,
                        subtotal,
                        tax,
                        total,
                    });

                    return {
                        jobId,
                        clientId: client.clientId,
                        clientWasCreated: client.clientWasCreated,
                    };
                },
                { isolationLevel: 'Serializable' },
            ),
        );

        return {
            ...booking,
            serviceName: service.name,
        };
    }

    private async resolveClientProfile(tx: Prisma.TransactionClient, dto: PublicCheckoutDto) {
        let clientId: string;
        let clientWasCreated = false;

        if (dto.client.email) {
            const existing = await tx.clientProfile.findFirst({
                where: { companyId: dto.companyId, email: dto.client.email },
                select: { id: true },
            });

            if (existing) {
                clientId = existing.id;
                await tx.clientProfile.update({
                    where: { id: clientId },
                    data: {
                        name: dto.client.name,
                        phone: dto.client.phone ?? undefined,
                        address: dto.client.address ?? undefined,
                        notes: dto.client.notes ?? undefined,
                    },
                });
            } else {
                const created = await tx.clientProfile.create({
                    data: {
                        companyId: dto.companyId,
                        name: dto.client.name,
                        email: dto.client.email,
                        phone: dto.client.phone ?? null,
                        address: dto.client.address ?? null,
                        notes: dto.client.notes ?? null,
                    },
                    select: { id: true },
                });
                clientId = created.id;
                clientWasCreated = true;
            }
        } else {
            const created = await tx.clientProfile.create({
                data: {
                    companyId: dto.companyId,
                    name: dto.client.name,
                    email: null,
                    phone: dto.client.phone ?? null,
                    address: dto.client.address ?? null,
                    notes: dto.client.notes ?? null,
                },
                select: { id: true },
            });
            clientId = created.id;
            clientWasCreated = true;
        }

        return { clientId, clientWasCreated };
    }

    private async upsertPublicJobDraft(
        tx: Prisma.TransactionClient,
        args: {
            dto: PublicCheckoutDto;
            clientId: string;
            service: {
                id: string;
                name: string;
                basePriceCents: number;
                currency: string | null;
            };
            start: Date;
            end: Date;
            subtotal: number;
            tax: number;
            total: number;
        },
    ) {
        const existingJob = await tx.job.findFirst({
            where: {
                companyId: args.dto.companyId,
                publicBookingIntentId: args.dto.bookingIntentId,
                source: 'PUBLIC',
            },
            select: {
                id: true,
                paidCents: true,
                payments: {
                    select: { status: true },
                },
                lineItems: {
                    select: { id: true },
                    orderBy: { id: 'asc' },
                },
            },
        });

        if (existingJob) {
            const hasSuccessfulPayment =
                existingJob.paidCents > 0 ||
                existingJob.payments.some((payment) => payment.status === PaymentStatus.SUCCEEDED);

            if (hasSuccessfulPayment) {
                throw new BadRequestException('This booking has already been submitted.');
            }

            await tx.job.update({
                where: { id: existingJob.id },
                data: {
                    clientId: args.clientId,
                    workerId: null,
                    title: args.service.name,
                    startAt: args.start,
                    endAt: args.end,
                    status: JobStatus.PENDING_CONFIRMATION,
                    location: args.dto.client.address ?? null,
                    subtotalCents: args.subtotal,
                    taxCents: args.tax,
                    totalCents: args.total,
                    paidCents: 0,
                    balanceCents: args.total,
                    currency: args.service.currency ?? 'CAD',
                },
            });

            await this.normalizeLineItems(tx, existingJob.id, existingJob.lineItems, args.service);

            return existingJob.id;
        }

        const job = await tx.job.create({
            data: {
                companyId: args.dto.companyId,
                clientId: args.clientId,
                workerId: null,
                publicBookingIntentId: args.dto.bookingIntentId,
                title: args.service.name,
                startAt: args.start,
                endAt: args.end,
                status: JobStatus.PENDING_CONFIRMATION,
                location: args.dto.client.address ?? null,
                source: 'PUBLIC',
                subtotalCents: args.subtotal,
                taxCents: args.tax,
                totalCents: args.total,
                paidCents: 0,
                balanceCents: args.total,
                currency: args.service.currency ?? 'CAD',
            },
        });

        await this.normalizeLineItems(tx, job.id, [], args.service);

        return job.id;
    }

    private async normalizeLineItems(
        tx: Prisma.TransactionClient,
        jobId: string,
        existingLineItems: Array<{ id: string }>,
        service: { id: string; name: string; basePriceCents: number },
    ) {
        if (existingLineItems[0]) {
            await tx.jobLineItem.update({
                where: { id: existingLineItems[0].id },
                data: {
                    serviceId: service.id,
                    description: service.name,
                    quantity: 1,
                    unitPriceCents: service.basePriceCents,
                    taxRateBps: 0,
                    totalCents: service.basePriceCents,
                },
            });
        } else {
            await tx.jobLineItem.create({
                data: {
                    jobId,
                    serviceId: service.id,
                    description: service.name,
                    quantity: 1,
                    unitPriceCents: service.basePriceCents,
                    taxRateBps: 0,
                    totalCents: service.basePriceCents,
                },
            });
        }

        if (existingLineItems.length > 1) {
            await tx.jobLineItem.deleteMany({
                where: {
                    jobId,
                    id: { not: existingLineItems[0].id },
                },
            });
        }
    }

    private async acquireCompanyDayBookingLock(
        tx: Prisma.TransactionClient,
        companyId: string,
        bookingDay: string,
    ) {
        await tx.$executeRaw`
            SELECT pg_advisory_xact_lock(hashtext(${companyId}), hashtext(${`public-booking:${bookingDay}`}))
        `;
    }

    private async withSerializableRetry<T>(operation: () => Promise<T>, maxAttempts = 3): Promise<T> {
        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
            try {
                return await operation();
            } catch (error) {
                const canRetry = this.isRetryableTransactionError(error) && attempt < maxAttempts;
                if (!canRetry) throw error;
            }
        }

        throw new BadRequestException('Booking could not be completed');
    }

    private isRetryableTransactionError(error: unknown) {
        return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
    }
}
