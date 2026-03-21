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
exports.PublicBookingService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const date_fns_1 = require("date-fns");
const luxon_1 = require("luxon");
const prisma_service_1 = require("../prisma/prisma.service");
const slots_service_1 = require("../slots/slots.service");
const payments_service_1 = require("../payments/payments.service");
const activity_service_1 = require("../activity/activity.service");
let PublicBookingService = class PublicBookingService {
    prisma;
    slots;
    payments;
    activity;
    constructor(prisma, slots, payments, activity) {
        this.prisma = prisma;
        this.slots = slots;
        this.payments = payments;
        this.activity = activity;
    }
    async getPublicService(companySlug, serviceSlug) {
        const company = await this.prisma.company.findFirst({
            where: { slug: companySlug, deletedAt: null },
            select: { id: true, name: true },
        });
        if (!company)
            throw new common_1.NotFoundException('Company not found');
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
        if (!service)
            throw new common_1.NotFoundException('Service not found');
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
    async getPublicSlots(args) {
        const fromDate = (0, date_fns_1.parseISO)(args.from);
        const toDate = (0, date_fns_1.parseISO)(args.to);
        if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime()) || toDate <= fromDate) {
            throw new common_1.BadRequestException('Invalid from/to');
        }
        const company = await this.prisma.company.findUnique({
            where: { id: args.companyId },
            select: { timezone: true },
        });
        if (!company)
            throw new common_1.NotFoundException('Company not found');
        const timezone = company.timezone ?? 'America/Edmonton';
        const dayKeys = [];
        let cursor = new Date(fromDate.getTime());
        while (cursor < toDate) {
            const dayKey = new Intl.DateTimeFormat('en-CA', {
                timeZone: timezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            }).format(cursor);
            if (!dayKeys.includes(dayKey))
                dayKeys.push(dayKey);
            cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
        }
        const results = await Promise.all(dayKeys.map((day) => this.slots.getCompanySlotsForDay({
            companyId: args.companyId,
            serviceId: args.serviceId,
            day,
        })));
        return results
            .flatMap((result) => result.slots)
            .filter((slot) => {
            const start = Date.parse(slot.start);
            const end = Date.parse(slot.end);
            return start >= fromDate.getTime() && end <= toDate.getTime();
        })
            .map((slot) => ({ start: slot.start, end: slot.end }));
    }
    async createPublicCheckout(dto) {
        const start = (0, date_fns_1.parseISO)(dto.start);
        if (isNaN(start.getTime()))
            throw new common_1.BadRequestException('Invalid start');
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
        if (!company)
            throw new common_1.BadRequestException('Invalid company');
        if (!service)
            throw new common_1.BadRequestException('Invalid service/company');
        const end = (0, date_fns_1.addMinutes)(start, service.durationMins);
        const timezone = company.timezone ?? 'America/Edmonton';
        const bookingDay = luxon_1.DateTime.fromJSDate(start, { zone: 'utc' }).setZone(timezone).toISODate();
        if (!bookingDay)
            throw new common_1.BadRequestException('Invalid start');
        const booking = await this.withSerializableRetry(() => this.prisma.$transaction(async (tx) => {
            await this.acquireCompanyDayBookingLock(tx, dto.companyId, bookingDay);
            const slotAllowed = await this.slots.isCompanySlotBookable({
                companyId: dto.companyId,
                serviceId: dto.serviceId,
                start,
                end,
            }, tx);
            if (!slotAllowed) {
                throw new common_1.UnprocessableEntityException('Selected slot is no longer available');
            }
            let clientId;
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
                }
                else {
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
            }
            else {
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
                    status: client_1.JobStatus.PENDING_CONFIRMATION,
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
        }, { isolationLevel: 'Serializable' }));
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
    async listPublicServices(companySlug) {
        const company = await this.prisma.company.findFirst({
            where: { slug: companySlug, deletedAt: null },
            select: { id: true, name: true },
        });
        if (!company) {
            throw new common_1.NotFoundException('Company not found');
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
    async acquireCompanyDayBookingLock(tx, companyId, bookingDay) {
        await tx.$executeRaw `
            SELECT pg_advisory_xact_lock(hashtext(${companyId}), hashtext(${`public-booking:${bookingDay}`}))
        `;
    }
    async withSerializableRetry(operation, maxAttempts = 3) {
        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
            try {
                return await operation();
            }
            catch (error) {
                const canRetry = this.isRetryableTransactionError(error) && attempt < maxAttempts;
                if (!canRetry)
                    throw error;
            }
        }
        throw new common_1.BadRequestException('Booking could not be completed');
    }
    isRetryableTransactionError(error) {
        return error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
    }
};
exports.PublicBookingService = PublicBookingService;
exports.PublicBookingService = PublicBookingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        slots_service_1.SlotsService,
        payments_service_1.PaymentsService,
        activity_service_1.ActivityService])
], PublicBookingService);
//# sourceMappingURL=public-booking.service.js.map