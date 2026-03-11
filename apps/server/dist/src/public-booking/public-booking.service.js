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
const prisma_service_1 = require("../prisma/prisma.service");
const slots_service_1 = require("../slots/slots.service");
const payments_service_1 = require("../payments/payments.service");
const date_fns_1 = require("date-fns");
const client_1 = require("@prisma/client");
let PublicBookingService = class PublicBookingService {
    prisma;
    slots;
    payments;
    constructor(prisma, slots, payments) {
        this.prisma = prisma;
        this.slots = slots;
        this.payments = payments;
    }
    async getPublicService(companySlug, serviceSlug) {
        const company = await this.prisma.company.findFirst({
            where: { slug: companySlug, deletedAt: null },
            select: { id: true, name: true },
        });
        if (!company)
            throw new common_1.NotFoundException("Company not found");
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
            throw new common_1.NotFoundException("Service not found");
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
            throw new common_1.BadRequestException("Invalid from/to");
        }
        const workers = await this.prisma.worker.findMany({
            where: { companyId: args.companyId, active: true },
            select: { id: true },
            orderBy: { createdAt: "asc" },
        });
        if (!workers.length)
            return [];
        const results = await Promise.allSettled(workers.map((w) => this.slots.getWorkerSlots({
            workerId: w.id,
            serviceId: args.serviceId,
            from: fromDate,
            to: toDate,
        })));
        const map = new Map();
        for (const r of results) {
            if (r.status !== "fulfilled")
                continue;
            for (const s of r.value.slots) {
                const key = `${s.start}|${s.end}`;
                if (!map.has(key))
                    map.set(key, s);
            }
        }
        return Array.from(map.values()).sort((a, b) => a.start.localeCompare(b.start));
    }
    async createPublicCheckout(dto) {
        const start = (0, date_fns_1.parseISO)(dto.start);
        if (isNaN(start.getTime()))
            throw new common_1.BadRequestException("Invalid start");
        const service = await this.prisma.service.findFirst({
            where: { id: dto.serviceId, companyId: dto.companyId, active: true, deletedAt: null },
            select: { id: true, companyId: true, name: true, durationMins: true, basePriceCents: true, currency: true },
        });
        if (!service)
            throw new common_1.BadRequestException("Invalid service/company");
        const end = (0, date_fns_1.addMinutes)(start, service.durationMins);
        const worker = await this.pickWorkerForSlot({
            companyId: dto.companyId,
            serviceId: dto.serviceId,
            start,
            end,
        });
        if (!worker)
            throw new common_1.UnprocessableEntityException("No available worker for that time");
        const job = await this.prisma.$transaction(async (tx) => {
            const conflicting = await tx.job.findFirst({
                where: {
                    companyId: dto.companyId,
                    workerId: worker.id,
                    status: { in: [client_1.JobStatus.PENDING_CONFIRMATION, client_1.JobStatus.SCHEDULED, client_1.JobStatus.IN_PROGRESS] },
                    NOT: [{ endAt: { lte: start } }, { startAt: { gte: end } }],
                },
                select: { id: true },
            });
            if (conflicting)
                throw new common_1.ConflictException("Overlapping booking");
            let clientId;
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
            }
            const subtotal = service.basePriceCents;
            const tax = 0;
            const total = subtotal + tax;
            const job = await tx.job.create({
                data: {
                    companyId: dto.companyId,
                    clientId,
                    workerId: worker.id,
                    startAt: start,
                    endAt: end,
                    status: client_1.JobStatus.PENDING_CONFIRMATION,
                    location: dto.client.address ?? null,
                    source: "PUBLIC",
                    subtotalCents: subtotal,
                    taxCents: tax,
                    totalCents: total,
                    paidCents: 0,
                    balanceCents: total,
                    currency: service.currency ?? "CAD",
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
            return job;
        }, { isolationLevel: "Serializable" });
        const session = await this.payments.createCheckoutSession(dto.companyId, "public", {
            jobId: job.id,
            successUrl: process.env.PUBLIC_BOOKING_SUCCESS_URL,
            cancelUrl: process.env.PUBLIC_BOOKING_CANCEL_URL,
            idempotencyKey: `public:job:${job.id}`,
        });
        return { checkoutUrl: session.url, jobId: job.id };
    }
    async listPublicServices(companySlug) {
        console.log("[PublicBooking] companySlug:", companySlug);
        const company = await this.prisma.company.findFirst({
            where: { slug: companySlug, deletedAt: null },
            select: { id: true, name: true, slug: true, deletedAt: true },
        });
        console.log("[PublicBooking] company found:", company);
        if (!company) {
            console.log("[PublicBooking] ❌ Company NOT found for slug:", companySlug);
            throw new common_1.NotFoundException("Company not found");
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
            orderBy: { createdAt: "asc" },
        });
        console.log(`[PublicBooking] services count: ${services.length}`);
        return {
            companyId: company.id,
            companyName: company.name,
            services,
        };
    }
    async pickWorkerForSlot(args) {
        const workers = await this.prisma.worker.findMany({
            where: { companyId: args.companyId, active: true },
            select: { id: true },
            orderBy: { createdAt: "asc" },
        });
        for (const w of workers) {
            const ok = await this.slots.isSlotBookable({
                companyId: args.companyId,
                workerId: w.id,
                serviceId: args.serviceId,
                start: args.start,
                end: args.end,
            });
            if (ok)
                return w;
        }
        return null;
    }
};
exports.PublicBookingService = PublicBookingService;
exports.PublicBookingService = PublicBookingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        slots_service_1.SlotsService,
        payments_service_1.PaymentsService])
], PublicBookingService);
//# sourceMappingURL=public-booking.service.js.map