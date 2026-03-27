import {
    BadRequestException,
    Inject,
    Injectable,
    NotFoundException,
    UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, JobStatus, PaymentStatus } from '@prisma/client';
import { addMinutes, parseISO } from 'date-fns';
import { DateTime } from 'luxon';
import { PrismaService } from '@/prisma/prisma.service';
import { SlotsService } from '@/slots/slots.service';
import { PaymentsService } from '@/payments/payments.service';
import { ActivityService } from '@/activity/activity.service';
import { AlertsService } from '@/alerts/alerts.service';
import { AuditLogService } from '@/observability/audit-log.service';
import { EMAIL_PROVIDER, type EmailProvider } from '@/notifications/providers/email.provider';
import { PublicCheckoutDto } from './dto/public-checkout.dto';
import { buildBookingAccessUrl, createBookingAccessToken, getBookingAccessExpiry } from './public-booking.utils';

@Injectable()
export class PublicBookingService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly slots: SlotsService,
        private readonly payments: PaymentsService,
        private readonly activity: ActivityService,
        private readonly alerts: AlertsService,
        private readonly audit: AuditLogService,
        @Inject(EMAIL_PROVIDER)
        private readonly emailProvider: EmailProvider,
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
                            title: service.name,
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
            successUrl: dto.successUrl ?? process.env.PUBLIC_BOOKING_SUCCESS_URL,
            cancelUrl: dto.cancelUrl ?? process.env.PUBLIC_BOOKING_CANCEL_URL,
            idempotencyKey: `public:job:${booking.jobId}`,
        });

        if (booking.clientWasCreated) {
            await this.activity.logClientCreated({
                companyId: dto.companyId,
                clientId: booking.clientId,
                actorType: 'PUBLIC',
                actorLabel: dto.client.name?.trim() || 'Customer',
                message: `${dto.client.name?.trim() || 'Customer'} profile was created from a public booking.`,
                metadata: {
                    source: 'public',
                    clientName: dto.client.name?.trim() || 'Customer',
                },
            });
        }

        await this.activity.logBookingSubmitted({
            companyId: dto.companyId,
            jobId: booking.jobId,
            clientId: booking.clientId,
            actorLabel: dto.client.name?.trim() || 'Customer',
            message: `${dto.client.name?.trim() || 'Customer'} submitted a booking request for ${service.name}.`,
            metadata: {
                source: 'public',
                serviceName: service.name,
                clientName: dto.client.name?.trim() || 'Customer',
            },
        });

        const accessLink = await this.ensureBookingAccessLink(dto.companyId, booking.jobId);

        return {
            checkoutUrl: session.url,
            jobId: booking.jobId,
            bookingAccessPath: `/booking/${accessLink.token}`,
        };
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

    async getBookingByAccessToken(token: string) {
        const booking = await this.findBookingAccessLink(token);

        const payment = await this.prisma.payment.findFirst({
            where: {
                jobId: booking.job.id,
                status: { in: [PaymentStatus.SUCCEEDED, PaymentStatus.PENDING, PaymentStatus.REQUIRES_ACTION] },
            },
            select: {
                status: true,
                amountCents: true,
                currency: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        return {
            booking: {
                token: booking.token,
                companyName: booking.company.name,
                jobId: booking.job.id,
                status: booking.job.status,
                title: booking.job.title ?? booking.job.lineItems[0]?.description ?? 'Booking',
                serviceName: booking.job.lineItems[0]?.description ?? booking.job.title ?? 'Service',
                scheduledAt: booking.job.startAt.toISOString(),
                endsAt: booking.job.endAt.toISOString(),
                timezone: booking.company.timezone ?? 'America/Edmonton',
                clientName: booking.job.client.name,
                clientEmail: booking.job.client.email,
                location: booking.job.location ?? booking.job.client.address ?? null,
                workerName: booking.job.worker?.displayName ?? null,
                totalCents: booking.job.totalCents,
                currency: booking.job.currency,
                notes: booking.job.client.notes ?? null,
                paymentStatus: payment?.status ?? null,
                paymentAmountCents: payment?.amountCents ?? null,
                requestChangesEmail: process.env.NOTIFY_FROM_EMAIL?.trim() || null,
                expiresAt: booking.expiresAt?.toISOString() ?? null,
            },
        };
    }

    async requestBookingChanges(token: string) {
        const booking = await this.findBookingAccessLink(token);
        const actorLabel = booking.job.client.name?.trim() || 'Customer';

        await this.audit.record({
            companyId: booking.companyId,
            entityType: 'BOOKING_ACCESS',
            entityId: booking.job.id,
            action: 'BOOKING_CHANGE_REQUESTED',
            changes: {
                jobId: booking.job.id,
                clientId: booking.job.clientId,
                actorLabel,
                requestedAt: new Date().toISOString(),
                source: 'public_booking_link',
            },
        });

        await this.alerts.createBookingReviewAlerts({
            companyId: booking.companyId,
            jobId: booking.job.id,
        });

        const emailSent = await this.sendBookingChangeRequestEmail({
            companyName: booking.company.name,
            clientName: actorLabel,
            clientEmail: booking.job.client.email,
            jobId: booking.job.id,
            serviceName: booking.job.lineItems[0]?.description ?? booking.job.title ?? 'Service',
            scheduledAt: booking.job.startAt,
            timezone: booking.company.timezone ?? 'America/Edmonton',
            accessUrl: buildBookingAccessUrl(booking.token),
        });

        return {
            ok: true,
            message: emailSent
                ? 'Your request was sent to the team.'
                : 'Your request was recorded and the team will follow up shortly.',
        };
    }

    async ensureBookingAccessLink(companyId: string, jobId: string) {
        const existing = await this.prisma.bookingAccessLink.findUnique({
            where: { jobId },
        });

        if (existing && (!existing.expiresAt || existing.expiresAt.getTime() > Date.now())) {
            return existing;
        }

        return this.prisma.bookingAccessLink.upsert({
            where: { jobId },
            create: {
                companyId,
                jobId,
                token: createBookingAccessToken(),
                expiresAt: getBookingAccessExpiry(),
            },
            update: {
                companyId,
                token: createBookingAccessToken(),
                expiresAt: getBookingAccessExpiry(),
            },
        });
    }

    private async findBookingAccessLink(token: string) {
        const booking = await this.prisma.bookingAccessLink.findUnique({
            where: { token },
            include: {
                company: {
                    select: {
                        id: true,
                        name: true,
                        timezone: true,
                    },
                },
                job: {
                    include: {
                        client: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                address: true,
                                notes: true,
                            },
                        },
                        worker: {
                            select: {
                                displayName: true,
                            },
                        },
                        lineItems: {
                            select: {
                                description: true,
                            },
                            orderBy: { id: 'asc' },
                            take: 1,
                        },
                    },
                },
            },
        });

        if (!booking || booking.job.source !== 'PUBLIC') {
            throw new NotFoundException('Booking not found');
        }

        if (booking.expiresAt && booking.expiresAt.getTime() <= Date.now()) {
            throw new NotFoundException('Booking link has expired');
        }

        return booking;
    }

    private async sendBookingChangeRequestEmail(input: {
        companyName: string;
        clientName: string;
        clientEmail: string | null;
        jobId: string;
        serviceName: string;
        scheduledAt: Date;
        timezone: string;
        accessUrl: string;
    }) {
        const from = process.env.NOTIFY_FROM_EMAIL?.trim();
        if (!from) {
            return false;
        }

        const scheduledFor = DateTime.fromJSDate(input.scheduledAt, { zone: 'utc' })
            .setZone(input.timezone)
            .toLocaleString(DateTime.DATETIME_FULL);

        const result = await this.emailProvider.sendEmail({
            from,
            to: from,
            subject: `${input.clientName} requested booking changes`,
            html: `
                <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
                    <p>${input.clientName} requested changes to a booking.</p>
                    <p><strong>Service:</strong> ${input.serviceName}</p>
                    <p><strong>When:</strong> ${scheduledFor}</p>
                    <p><strong>Client email:</strong> ${input.clientEmail ?? 'Not provided'}</p>
                    <p><strong>Job ID:</strong> ${input.jobId}</p>
                    <p><a href="${input.accessUrl}">Open public booking page</a></p>
                    <p>Please follow up with the customer to confirm the requested update.</p>
                </div>
            `,
        });

        return result.ok;
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
