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
exports.BookingAccessService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const public_booking_utils_1 = require("./public-booking.utils");
let BookingAccessService = class BookingAccessService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async ensureBookingAccessLink(companyId, jobId) {
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
                token: (0, public_booking_utils_1.createBookingAccessToken)(),
                expiresAt: (0, public_booking_utils_1.getBookingAccessExpiry)(),
            },
            update: {
                companyId,
                token: (0, public_booking_utils_1.createBookingAccessToken)(),
                expiresAt: (0, public_booking_utils_1.getBookingAccessExpiry)(),
            },
        });
    }
    async getJobAccessUrl(companyId, jobId, source) {
        if (source !== 'PUBLIC') {
            return null;
        }
        const link = await this.ensureBookingAccessLink(companyId, jobId);
        return (0, public_booking_utils_1.buildBookingAccessUrl)(link.token);
    }
    async getJobAccessPath(companyId, jobId, source) {
        const url = await this.getJobAccessUrl(companyId, jobId, source);
        if (!url) {
            return null;
        }
        try {
            const parsed = new URL(url);
            return `${parsed.pathname}${parsed.search}${parsed.hash}`;
        }
        catch {
            const token = url.split('/').filter(Boolean).pop();
            return token ? `/booking/${token}` : null;
        }
    }
    async findBookingAccessLink(token) {
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
            throw new common_1.NotFoundException('Booking not found');
        }
        if (booking.expiresAt && booking.expiresAt.getTime() <= Date.now()) {
            throw new common_1.NotFoundException('Booking link has expired');
        }
        return booking;
    }
    async getBookingByAccessToken(token) {
        const booking = await this.findBookingAccessLink(token);
        const payment = await this.prisma.payment.findFirst({
            where: {
                jobId: booking.job.id,
                status: { in: [client_1.PaymentStatus.SUCCEEDED, client_1.PaymentStatus.PENDING, client_1.PaymentStatus.REQUIRES_ACTION] },
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
};
exports.BookingAccessService = BookingAccessService;
exports.BookingAccessService = BookingAccessService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BookingAccessService);
//# sourceMappingURL=booking-access.service.js.map