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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicBookingService = void 0;
const common_1 = require("@nestjs/common");
const alerts_service_1 = require("../alerts/alerts.service");
const activity_service_1 = require("../activity/activity.service");
const audit_log_service_1 = require("../observability/audit-log.service");
const payments_service_1 = require("../payments/payments.service");
const prisma_service_1 = require("../prisma/prisma.service");
const slots_service_1 = require("../slots/slots.service");
const email_provider_1 = require("../notifications/providers/email.provider");
const booking_access_service_1 = require("./booking-access.service");
const booking_change_request_service_1 = require("./booking-change-request.service");
const public_availability_service_1 = require("./public-availability.service");
const public_booking_checkout_service_1 = require("./public-booking-checkout.service");
const public_booking_persistence_service_1 = require("./public-booking-persistence.service");
const public_catalog_service_1 = require("./public-catalog.service");
let PublicBookingService = class PublicBookingService {
    catalog;
    availability;
    checkout;
    bookingAccess;
    bookingChangeRequests;
    persistence;
    constructor(prisma, slots, payments, activity, alerts, audit, emailProvider) {
        this.catalog = new public_catalog_service_1.PublicCatalogService(prisma);
        this.availability = new public_availability_service_1.PublicAvailabilityService(prisma, slots);
        this.persistence = new public_booking_persistence_service_1.PublicBookingPersistenceService(prisma, slots);
        this.bookingAccess = new booking_access_service_1.BookingAccessService(prisma);
        this.checkout = new public_booking_checkout_service_1.PublicBookingCheckoutService(this.persistence, payments, activity, this.bookingAccess);
        this.bookingChangeRequests = new booking_change_request_service_1.BookingChangeRequestService(this.bookingAccess, alerts, audit, emailProvider);
    }
    async getPublicService(companySlug, serviceSlug) {
        return this.catalog.getPublicService(companySlug, serviceSlug);
    }
    async getPublicSlots(args) {
        return this.availability.getPublicSlots(args);
    }
    async createPublicCheckout(dto) {
        return this.checkout.createPublicCheckout(dto);
    }
    async listPublicServices(companySlug) {
        return this.catalog.listPublicServices(companySlug);
    }
    async getBookingByAccessToken(token) {
        return this.bookingAccess.getBookingByAccessToken(token);
    }
    async requestBookingChanges(token, dto) {
        return this.bookingChangeRequests.requestBookingChanges(token, dto);
    }
    async ensureBookingAccessLink(companyId, jobId) {
        return this.bookingAccess.ensureBookingAccessLink(companyId, jobId);
    }
    async findBookingAccessLink(token) {
        return this.bookingAccess.findBookingAccessLink(token);
    }
    async sendBookingChangeRequestEmail(input) {
        return this.bookingChangeRequests.sendBookingChangeRequestEmail(input);
    }
    async withSerializableRetry(operation, maxAttempts = 3) {
        return this.persistence.withSerializableRetry(operation, maxAttempts);
    }
    isRetryableTransactionError(error) {
        return this.persistence.isRetryableTransactionError(error);
    }
};
exports.PublicBookingService = PublicBookingService;
exports.PublicBookingService = PublicBookingService = __decorate([
    (0, common_1.Injectable)(),
    __param(5, (0, common_1.Optional)()),
    __param(6, (0, common_1.Optional)()),
    __param(6, (0, common_1.Inject)(email_provider_1.EMAIL_PROVIDER)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        slots_service_1.SlotsService,
        payments_service_1.PaymentsService,
        activity_service_1.ActivityService,
        alerts_service_1.AlertsService,
        audit_log_service_1.AuditLogService, Object])
], PublicBookingService);
//# sourceMappingURL=public-booking.service.js.map