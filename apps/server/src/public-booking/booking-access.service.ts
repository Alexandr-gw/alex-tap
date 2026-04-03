import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import {
    buildBookingAccessUrl,
    createBookingAccessToken,
    getBookingAccessExpiry,
} from './public-booking.utils';

@Injectable()
export class BookingAccessService {
    constructor(private readonly prisma: PrismaService) {}

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

    async getJobAccessUrl(companyId: string, jobId: string, source: string | null) {
        if (source !== 'PUBLIC') {
            return null;
        }

        const link = await this.ensureBookingAccessLink(companyId, jobId);
        return buildBookingAccessUrl(link.token);
    }

    async getJobAccessPath(companyId: string, jobId: string, source: string | null) {
        const url = await this.getJobAccessUrl(companyId, jobId, source);
        if (!url) {
            return null;
        }

        try {
            const parsed = new URL(url);
            return `${parsed.pathname}${parsed.search}${parsed.hash}`;
        } catch {
            const token = url.split('/').filter(Boolean).pop();
            return token ? `/booking/${token}` : null;
        }
    }

    async findBookingAccessLink(token: string) {
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
}
