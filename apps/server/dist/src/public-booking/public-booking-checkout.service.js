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
exports.PublicBookingCheckoutService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const activity_service_1 = require("../activity/activity.service");
const payments_service_1 = require("../payments/payments.service");
const booking_access_service_1 = require("./booking-access.service");
const public_booking_persistence_service_1 = require("./public-booking-persistence.service");
let PublicBookingCheckoutService = class PublicBookingCheckoutService {
    persistence;
    payments;
    activity;
    bookingAccess;
    constructor(persistence, payments, activity, bookingAccess) {
        this.persistence = persistence;
        this.payments = payments;
        this.activity = activity;
        this.bookingAccess = bookingAccess;
    }
    async createPublicCheckout(dto) {
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
    buildPublicCheckoutIdempotencyKey(dto) {
        const fingerprint = (0, crypto_1.createHash)('sha256')
            .update(JSON.stringify({
            bookingIntentId: dto.bookingIntentId,
            serviceId: dto.serviceId,
            start: dto.start,
            clientName: dto.client.name?.trim() || '',
            clientEmail: dto.client.email?.trim()?.toLowerCase() || '',
            clientPhone: dto.client.phone?.trim() || '',
            clientAddress: dto.client.address?.trim() || '',
        }))
            .digest('hex')
            .slice(0, 16);
        return `public:intent:${dto.bookingIntentId}:${fingerprint}`;
    }
};
exports.PublicBookingCheckoutService = PublicBookingCheckoutService;
exports.PublicBookingCheckoutService = PublicBookingCheckoutService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [public_booking_persistence_service_1.PublicBookingPersistenceService,
        payments_service_1.PaymentsService,
        activity_service_1.ActivityService,
        booking_access_service_1.BookingAccessService])
], PublicBookingCheckoutService);
//# sourceMappingURL=public-booking-checkout.service.js.map