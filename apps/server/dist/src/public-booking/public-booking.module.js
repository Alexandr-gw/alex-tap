"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicBookingModule = void 0;
const common_1 = require("@nestjs/common");
const activity_module_1 = require("../activity/activity.module");
const alerts_module_1 = require("../alerts/alerts.module");
const notification_module_1 = require("../notifications/notification.module");
const observability_module_1 = require("../observability/observability.module");
const payments_module_1 = require("../payments/payments.module");
const slots_module_1 = require("../slots/slots.module");
const booking_access_service_1 = require("./booking-access.service");
const booking_change_request_service_1 = require("./booking-change-request.service");
const public_availability_service_1 = require("./public-availability.service");
const public_booking_checkout_service_1 = require("./public-booking-checkout.service");
const public_booking_controller_1 = require("./public-booking.controller");
const public_booking_persistence_service_1 = require("./public-booking-persistence.service");
const public_booking_service_1 = require("./public-booking.service");
const public_catalog_service_1 = require("./public-catalog.service");
let PublicBookingModule = class PublicBookingModule {
};
exports.PublicBookingModule = PublicBookingModule;
exports.PublicBookingModule = PublicBookingModule = __decorate([
    (0, common_1.Module)({
        imports: [slots_module_1.SlotsModule, payments_module_1.PaymentsModule, activity_module_1.ActivityModule, alerts_module_1.AlertsModule, observability_module_1.ObservabilityModule, notification_module_1.NotificationModule],
        controllers: [public_booking_controller_1.PublicBookingController],
        providers: [
            public_booking_service_1.PublicBookingService,
            public_catalog_service_1.PublicCatalogService,
            public_availability_service_1.PublicAvailabilityService,
            booking_access_service_1.BookingAccessService,
            booking_change_request_service_1.BookingChangeRequestService,
            public_booking_persistence_service_1.PublicBookingPersistenceService,
            public_booking_checkout_service_1.PublicBookingCheckoutService,
        ],
        exports: [public_booking_service_1.PublicBookingService],
    })
], PublicBookingModule);
//# sourceMappingURL=public-booking.module.js.map