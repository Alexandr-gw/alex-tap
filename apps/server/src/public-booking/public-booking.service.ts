import {
    BadRequestException,
    Injectable,
    NotFoundException,
    UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, JobStatus } from '@prisma/client';
import { addMinutes, parseISO } from 'date-fns';
import { DateTime } from 'luxon';
import { PrismaService } from '@/prisma/prisma.service';
import { SlotsService } from '@/slots/slots.service';
import { PaymentsService } from '@/payments/payments.service';
import { ActivityService } from '@/activity/activity.service';
import { PublicCheckoutDto } from './dto/public-checkout.dto';

@Injectable()
export class PublicBookingService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly slots: SlotsService,
        private readonly payments: PaymentsService,
        private readonly activity: ActivityService,
    ) {}

    async getPublicService(companySlug: string, serviceSlug: string) {
        const company = await this.prisma.company.findFirst({
            where: { slug: companySlug, deletedAt: null },
            select: { id: true, name: true },
        });
        if (!company) throw new NotFoundException('Company not found');

        const service = await this.prisma.service.findFirst({
            where: {
                companyId: company.id,
                slug: serviceSlug,
                active: true,
                deletedAt: null,
            },
            select: {
                id: true,
                name: true,
                durationMins: true,
                basePriceCents: true,
                currency: true,
                companyId: true,
            },
        });
        if (!service) throw new NotFoundException('Service not found');

        return {
            companyId: company.id,
            companyName: company.name,
            serviceId: service.id,
            name: service.name,
            durationMins: service.durationMins,
            basePriceCents: service.basePriceCents,
            currency: service.currency,
        };
    }

    async getPublicSlots(args: { companyId: string; serviceId: string; from: string; to: string }) {
        const fromDate = parseISO(args.from);
        const toDate = parseISO(args.to);
        if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime()) || toDate <= fromDate) {
            throw new BadRequestException('Invalid from/to');
        }

        const company = await this.prisma.company.findUnique({
            where: { id: args.companyId },
            select: { timezone: true },
        });
        if (!company) throw new NotFoundException('Company not found');

        const timezone = company.timezone ?? 'America/Edmonton';
        const dayKeys: string[] = [];
        let cursor = new Date(fromDate.getTime());
        while (cursor < toDate) {
            const dayKey = new Intl.DateTimeFormat('en-CA', {
                timeZone: timezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            }).format(cursor);
            if (!dayKeys.includes(dayKey)) dayKeys.push(dayKey);
            cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
        }

        const results = await Promise.all(
            dayKeys.map((day) =>
                this.slots.getCompanySlotsForDay({
                    companyId: args.companyId,
                    serviceId: args.serviceId,
                    day,
                }),
            ),
        );

        return results
            .flatMap((result) => result.slots)
            .filter((slot) => {
                const start = Date.parse(slot.start);
                const end = Date.parse(slot.end);
                return start >= fromDate.getTime() && end <= toDate.getTime();
            })
            .map((slot) => ({ start: slot.start, end: slot.end }));
    }

    async createPublicCheckout(dto: PublicCheckoutDto) {
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

                    const subtotal = service.basePriceCents;
                    const tax = 0;
                    const total = subtotal + tax;

                    const job = await tx.job.create({
                        data: {
                            companyId: dto.companyId,
                            clientId,
                            workerId: null,
                            startAt: start,
                            endAt: end,
                            status: JobStatus.PENDING_CONFIRMATION,
                            location: dto.client.address ?? null,
                            source: 'PUBLIC',
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

                    return {
                        jobId: job.id,
                        clientId,
                        clientWasCreated,
                    };
                },
                { isolationLevel: 'Serializable' },
            ),
        );

        const session = await this.payments.createCheckoutSession(dto.companyId, 'public', {
            jobId: booking.jobId,
            successUrl: process.env.PUBLIC_BOOKING_SUCCESS_URL,
            cancelUrl: process.env.PUBLIC_BOOKING_CANCEL_URL,
            idempotencyKey: `public:job:${booking.jobId}`,
        });

        if (booking.clientWasCreated) {
            await this.activity.logClientCreated({
                companyId: dto.companyId,
                clientId: booking.clientId,
                actorType: 'PUBLIC',
                actorLabel: dto.client.name?.trim() || 'Customer',
            });
        }

        await this.activity.logBookingSubmitted({
            companyId: dto.companyId,
            jobId: booking.jobId,
            clientId: booking.clientId,
            actorLabel: dto.client.name?.trim() || 'Customer',
            metadata: { source: 'public' },
        });

        return { checkoutUrl: session.url, jobId: booking.jobId };
    }

    async listPublicServices(companySlug: string) {
        const company = await this.prisma.company.findFirst({
            where: { slug: companySlug, deletedAt: null },
            select: { id: true, name: true },
        });

        if (!company) {
            throw new NotFoundException('Company not found');
        }

        const services = await this.prisma.service.findMany({
            where: {
                companyId: company.id,
                active: true,
                deletedAt: null,
            },
            select: {
                id: true,
                name: true,
                slug: true,
                durationMins: true,
                basePriceCents: true,
                currency: true,
            },
            orderBy: { createdAt: 'asc' },
        });

        return {
            companyId: company.id,
            companyName: company.name,
            services,
        };
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
