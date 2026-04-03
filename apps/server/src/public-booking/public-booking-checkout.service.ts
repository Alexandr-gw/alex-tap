import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { ActivityService } from '@/activity/activity.service';
import { PaymentsService } from '@/payments/payments.service';
import { BookingAccessService } from './booking-access.service';
import { PublicCheckoutDto } from './dto/public-checkout.dto';
import { PublicBookingPersistenceService } from './public-booking-persistence.service';

@Injectable()
export class PublicBookingCheckoutService {
    constructor(
        private readonly persistence: PublicBookingPersistenceService,
        private readonly payments: PaymentsService,
        private readonly activity: ActivityService,
        private readonly bookingAccess: BookingAccessService,
    ) {}

    async createPublicCheckout(dto: PublicCheckoutDto) {
        const booking = await this.persistence.createPublicBookingDraft(dto);

        const session = await this.payments.createCheckoutSession(dto.companyId, 'public', {
            jobId: booking.jobId,
            successUrl: dto.successUrl ?? process.env.PUBLIC_BOOKING_SUCCESS_URL,
            cancelUrl: dto.cancelUrl ?? process.env.PUBLIC_BOOKING_CANCEL_URL,
            idempotencyKey: this.buildPublicCheckoutIdempotencyKey(dto),
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
            message: `${dto.client.name?.trim() || 'Customer'} submitted a booking request for ${booking.serviceName}.`,
            metadata: {
                source: 'public',
                serviceName: booking.serviceName,
                clientName: dto.client.name?.trim() || 'Customer',
            },
        });

        const accessLink = await this.bookingAccess.ensureBookingAccessLink(dto.companyId, booking.jobId);

        return {
            checkoutUrl: session.url,
            jobId: booking.jobId,
            bookingAccessPath: `/booking/${accessLink.token}`,
        };
    }

    private buildPublicCheckoutIdempotencyKey(dto: PublicCheckoutDto) {
        const fingerprint = createHash('sha256')
            .update(
                JSON.stringify({
                    bookingIntentId: dto.bookingIntentId,
                    serviceId: dto.serviceId,
                    start: dto.start,
                    clientName: dto.client.name?.trim() || '',
                    clientEmail: dto.client.email?.trim()?.toLowerCase() || '',
                    clientPhone: dto.client.phone?.trim() || '',
                    clientAddress: dto.client.address?.trim() || '',
                }),
            )
            .digest('hex')
            .slice(0, 16);

        return `public:intent:${dto.bookingIntentId}:${fingerprint}`;
    }
}
