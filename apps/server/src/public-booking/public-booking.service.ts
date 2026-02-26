import { BadRequestException, ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import { SlotsService } from "@/slots/slots.service";
import { PaymentsService } from "@/payments/payments.service";
import { addMinutes, parseISO } from "date-fns";
import { Prisma, JobStatus } from "@prisma/client";
import { PublicCheckoutDto } from "./dto/public-checkout.dto";

@Injectable()
export class PublicBookingService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly slots: SlotsService,
        private readonly payments: PaymentsService,
    ) {}

    async getPublicService(companySlug: string, serviceSlug: string) {
        const company = await this.prisma.company.findFirst({
            where: { slug: companySlug, deletedAt: null },
            select: { id: true, name: true },
        });
        if (!company) throw new NotFoundException("Company not found");

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
        if (!service) throw new NotFoundException("Service not found");

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
            throw new BadRequestException("Invalid from/to");
        }

        // fetch active workers for company
        const workers = await this.prisma.worker.findMany({
            where: { companyId: args.companyId, active: true },
            select: { id: true },
            orderBy: { createdAt: "asc" },
        });
        if (!workers.length) return [];

        // get slots per worker -> union unique by start|end
        const results = await Promise.allSettled(
            workers.map((w) =>
                this.slots.getWorkerSlots({
                    workerId: w.id,
                    serviceId: args.serviceId,
                    from: fromDate,
                    to: toDate,
                }),
            ),
        );

        const map = new Map<string, { start: string; end: string }>();
        for (const r of results) {
            if (r.status !== "fulfilled") continue;
            for (const s of r.value.slots) {
                const key = `${s.start}|${s.end}`;
                if (!map.has(key)) map.set(key, s);
            }
        }

        return Array.from(map.values()).sort((a, b) => a.start.localeCompare(b.start));
    }

    async createPublicCheckout(dto: PublicCheckoutDto) {
        const start = parseISO(dto.start);
        if (isNaN(start.getTime())) throw new BadRequestException("Invalid start");

        const service = await this.prisma.service.findFirst({
            where: { id: dto.serviceId, companyId: dto.companyId, active: true, deletedAt: null },
            select: { id: true, companyId: true, name: true, durationMins: true, basePriceCents: true, currency: true },
        });
        if (!service) throw new BadRequestException("Invalid service/company");

        const end = addMinutes(start, service.durationMins);

        // pick an available worker (MVP: first active worker who can book that slot)
        const worker = await this.pickWorkerForSlot({
            companyId: dto.companyId,
            serviceId: dto.serviceId,
            start,
            end,
        });
        if (!worker) throw new UnprocessableEntityException("No available worker for that time");

        // Transaction: upsert client + create job + line item + totals
        const job = await this.prisma.$transaction(
            async (tx: Prisma.TransactionClient) => {
                // overlap guard (same as JobsService, but internal pick)
                const conflicting = await tx.job.findFirst({
                    where: {
                        companyId: dto.companyId,
                        workerId: worker.id,
                        status: { in: [JobStatus.SCHEDULED, JobStatus.IN_PROGRESS] },
                        NOT: [{ endAt: { lte: start } }, { startAt: { gte: end } }],
                    },
                    select: { id: true },
                });
                if (conflicting) throw new ConflictException("Overlapping booking");

                // client upsert by email if present
                let clientId: string;
                if (dto.client.email) {
                    const existing = await tx.clientProfile.findFirst({
                        where: { companyId: dto.companyId, email: dto.client.email },
                        select: { id: true },
                    });

                    if (existing) {
                        clientId = existing.id;

                        // keep fresh details (optional but useful)
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
                        status: JobStatus.SCHEDULED,
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
            },
            { isolationLevel: "Serializable" },
        );

        // Create Stripe checkout session (public actor => null/"public")
        const session = await this.payments.createCheckoutSession(dto.companyId, "public", {
            jobId: job.id,
            successUrl: process.env.PUBLIC_BOOKING_SUCCESS_URL,
            cancelUrl: process.env.PUBLIC_BOOKING_CANCEL_URL,
            idempotencyKey: `public:job:${job.id}`,
        });

        return { checkoutUrl: session.url, jobId: job.id };
    }

    async listPublicServices(companySlug: string) {
        console.log("[PublicBooking] companySlug:", companySlug);

        const company = await this.prisma.company.findFirst({
            where: { slug: companySlug, deletedAt: null },
            select: { id: true, name: true, slug: true, deletedAt: true },
        });

        console.log("[PublicBooking] company found:", company);

        if (!company) {
            console.log("[PublicBooking] ❌ Company NOT found for slug:", companySlug);
            throw new NotFoundException("Company not found");
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

    private async pickWorkerForSlot(args: { companyId: string; serviceId: string; start: Date; end: Date }) {
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
            if (ok) return w;
        }
        return null;
    }
}