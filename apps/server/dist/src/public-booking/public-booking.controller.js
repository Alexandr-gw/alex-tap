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
exports.PublicBookingController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const public_booking_service_1 = require("./public-booking.service");
const public_checkout_dto_1 = require("./dto/public-checkout.dto");
const payments_service_1 = require("../payments/payments.service");
const request_booking_changes_dto_1 = require("./dto/request-booking-changes.dto");
const get_public_slots_dto_1 = require("./dto/get-public-slots.dto");
let PublicBookingController = class PublicBookingController {
    svc;
    payments;
    constructor(svc, payments) {
        this.svc = svc;
        this.payments = payments;
    }
    async getService(companySlug, serviceSlug) {
        return this.svc.getPublicService(companySlug, serviceSlug);
    }
    async getSlots(query) {
        return this.svc.getPublicSlots(query);
    }
    async listServices(companySlug) {
        return this.svc.listPublicServices(companySlug);
    }
    async checkout(dto) {
        return this.svc.createPublicCheckout(dto);
    }
    async getBookingByAccessToken(token) {
        return this.svc.getBookingByAccessToken(token);
    }
    async requestBookingChanges(token, dto) {
        return this.svc.requestBookingChanges(token, dto);
    }
    async getPublicCheckoutSessionSummary(sessionId) {
        return this.payments.getCheckoutSessionSummaryPublic({ sessionId });
    }
};
exports.PublicBookingController = PublicBookingController;
__decorate([
    (0, common_1.Get)("companies/:companySlug/services/:serviceSlug"),
    __param(0, (0, common_1.Param)("companySlug")),
    __param(1, (0, common_1.Param)("serviceSlug")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PublicBookingController.prototype, "getService", null);
__decorate([
    (0, common_1.Get)("slots"),
    __param(0, (0, common_1.Query)(new common_1.ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [get_public_slots_dto_1.GetPublicSlotsDto]),
    __metadata("design:returntype", Promise)
], PublicBookingController.prototype, "getSlots", null);
__decorate([
    (0, common_1.Get)("companies/:companySlug/services"),
    __param(0, (0, common_1.Param)("companySlug")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PublicBookingController.prototype, "listServices", null);
__decorate([
    (0, common_1.Post)("bookings/checkout"),
    (0, throttler_1.Throttle)({ default: { ttl: 600_000, limit: 5 } }),
    __param(0, (0, common_1.Body)(new common_1.ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [public_checkout_dto_1.PublicCheckoutDto]),
    __metadata("design:returntype", Promise)
], PublicBookingController.prototype, "checkout", null);
__decorate([
    (0, common_1.Get)("bookings/access/:token"),
    __param(0, (0, common_1.Param)("token")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PublicBookingController.prototype, "getBookingByAccessToken", null);
__decorate([
    (0, common_1.Post)("bookings/access/:token/request-changes"),
    (0, throttler_1.Throttle)({ default: { ttl: 1_800_000, limit: 3 } }),
    __param(0, (0, common_1.Param)("token")),
    __param(1, (0, common_1.Body)(new common_1.ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, request_booking_changes_dto_1.RequestBookingChangesDto]),
    __metadata("design:returntype", Promise)
], PublicBookingController.prototype, "requestBookingChanges", null);
__decorate([
    (0, common_1.Get)("payments/checkout-session/:sessionId"),
    __param(0, (0, common_1.Param)("sessionId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PublicBookingController.prototype, "getPublicCheckoutSessionSummary", null);
exports.PublicBookingController = PublicBookingController = __decorate([
    (0, common_1.Controller)("api/v1/public"),
    (0, throttler_1.Throttle)({ default: { ttl: 60_000, limit: 30 } }),
    __metadata("design:paramtypes", [public_booking_service_1.PublicBookingService,
        payments_service_1.PaymentsService])
], PublicBookingController);
//# sourceMappingURL=public-booking.controller.js.map