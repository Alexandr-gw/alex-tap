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
const public_booking_service_1 = require("./public-booking.service");
const public_checkout_dto_1 = require("./dto/public-checkout.dto");
let PublicBookingController = class PublicBookingController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    async getService(companySlug, serviceSlug) {
        return this.svc.getPublicService(companySlug, serviceSlug);
    }
    async getSlots(companyId, serviceId, from, to) {
        if (!companyId || !serviceId || !from || !to) {
            throw new common_1.BadRequestException("Missing query params: companyId, serviceId, from, to");
        }
        return this.svc.getPublicSlots({ companyId, serviceId, from, to });
    }
    async listServices(companySlug) {
        return this.svc.listPublicServices(companySlug);
    }
    async checkout(dto) {
        return this.svc.createPublicCheckout(dto);
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
    __param(0, (0, common_1.Query)("companyId")),
    __param(1, (0, common_1.Query)("serviceId")),
    __param(2, (0, common_1.Query)("from")),
    __param(3, (0, common_1.Query)("to")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
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
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [public_checkout_dto_1.PublicCheckoutDto]),
    __metadata("design:returntype", Promise)
], PublicBookingController.prototype, "checkout", null);
exports.PublicBookingController = PublicBookingController = __decorate([
    (0, common_1.Controller)("api/v1/public"),
    __metadata("design:paramtypes", [public_booking_service_1.PublicBookingService])
], PublicBookingController);
//# sourceMappingURL=public-booking.controller.js.map