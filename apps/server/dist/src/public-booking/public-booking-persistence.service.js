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
exports.PublicBookingPersistenceService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const date_fns_1 = require("date-fns");
const luxon_1 = require("luxon");
const prisma_service_1 = require("../prisma/prisma.service");
const slots_service_1 = require("../slots/slots.service");
let PublicBookingPersistenceService = class PublicBookingPersistenceService {
    prisma;
    slots;
    constructor(prisma, slots) {
        this.prisma = prisma;
        this.slots = slots;
    }
    async createPublicBookingDraft(dto) {
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
        }, { isolationLevel: 'Serializable' }));
        return {
            ...booking,
            serviceName: service.name,
        };
    }
    async resolveClientProfile(tx, dto) {
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
        return { clientId, clientWasCreated };
    }
    async upsertPublicJobDraft(tx, args) {
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
            const hasSuccessfulPayment = existingJob.paidCents > 0 ||
                existingJob.payments.some((payment) => payment.status === client_1.PaymentStatus.SUCCEEDED);
            if (hasSuccessfulPayment) {
                throw new common_1.BadRequestException('This booking has already been submitted.');
            }
            await tx.job.update({
                where: { id: existingJob.id },
                data: {
                    clientId: args.clientId,
                    workerId: null,
                    title: args.service.name,
                    startAt: args.start,
                    endAt: args.end,
                    status: client_1.JobStatus.PENDING_CONFIRMATION,
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
                status: client_1.JobStatus.PENDING_CONFIRMATION,
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
    async normalizeLineItems(tx, jobId, existingLineItems, service) {
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
        }
        else {
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
exports.PublicBookingPersistenceService = PublicBookingPersistenceService;
exports.PublicBookingPersistenceService = PublicBookingPersistenceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        slots_service_1.SlotsService])
], PublicBookingPersistenceService);
//# sourceMappingURL=public-booking-persistence.service.js.map