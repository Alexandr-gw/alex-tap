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
exports.BookingChangeRequestService = void 0;
const common_1 = require("@nestjs/common");
const luxon_1 = require("luxon");
const alerts_service_1 = require("../alerts/alerts.service");
const audit_log_service_1 = require("../observability/audit-log.service");
const email_provider_1 = require("../notifications/providers/email.provider");
const public_booking_utils_1 = require("./public-booking.utils");
const booking_access_service_1 = require("./booking-access.service");
let BookingChangeRequestService = class BookingChangeRequestService {
    bookingAccess;
    alerts;
    audit;
    emailProvider;
    constructor(bookingAccess, alerts, audit, emailProvider) {
        this.bookingAccess = bookingAccess;
        this.alerts = alerts;
        this.audit = audit;
        this.emailProvider = emailProvider;
    }
    async requestBookingChanges(token, dto) {
        const booking = await this.bookingAccess.findBookingAccessLink(token);
        const actorLabel = booking.job.client.name?.trim() || 'Customer';
        const customerMessage = dto?.message?.trim() || null;
        await this.audit.record({
            companyId: booking.companyId,
            entityType: 'BOOKING_ACCESS',
            entityId: booking.job.id,
            action: 'BOOKING_CHANGE_REQUESTED',
            changes: {
                jobId: booking.job.id,
                clientId: booking.job.clientId,
                actorLabel,
                requestedAt: new Date().toISOString(),
                source: 'public_booking_link',
                customerMessage,
            },
        });
        await this.alerts.createBookingReviewAlerts({
            companyId: booking.companyId,
            jobId: booking.job.id,
            reason: 'CHANGE_REQUEST',
            customerMessage,
        });
        const emailSent = await this.sendBookingChangeRequestEmail({
            companyName: booking.company.name,
            clientName: actorLabel,
            clientEmail: booking.job.client.email,
            jobId: booking.job.id,
            serviceName: booking.job.lineItems[0]?.description ?? booking.job.title ?? 'Service',
            scheduledAt: booking.job.startAt,
            timezone: booking.company.timezone ?? 'America/Edmonton',
            accessUrl: (0, public_booking_utils_1.buildBookingAccessUrl)(booking.token),
            customerMessage,
        });
        return {
            ok: true,
            message: emailSent
                ? 'Your request was sent to the team. They will reach out to confirm the update.'
                : 'Your request was recorded and the team will reach out shortly.',
        };
    }
    async sendBookingChangeRequestEmail(input) {
        const from = process.env.NOTIFY_FROM_EMAIL?.trim();
        if (!from) {
            return false;
        }
        const scheduledFor = luxon_1.DateTime.fromJSDate(input.scheduledAt, { zone: 'utc' })
            .setZone(input.timezone)
            .toLocaleString(luxon_1.DateTime.DATETIME_FULL);
        const result = await this.emailProvider.sendEmail({
            from,
            to: from,
            subject: `${input.clientName} requested booking changes`,
            html: `
                <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
                    <p>${input.clientName} requested changes to a booking.</p>
                    <p><strong>Service:</strong> ${input.serviceName}</p>
                    <p><strong>When:</strong> ${scheduledFor}</p>
                    <p><strong>Client email:</strong> ${input.clientEmail ?? 'Not provided'}</p>
                    <p><strong>Job ID:</strong> ${input.jobId}</p>
                    <p><strong>Requested change:</strong> ${input.customerMessage ?? 'Customer asked the team to follow up.'}</p>
                    <p><a href="${input.accessUrl}">Open public booking page</a></p>
                    <p>Please follow up with the customer to confirm the requested update.</p>
                </div>
            `,
        });
        return result.ok;
    }
};
exports.BookingChangeRequestService = BookingChangeRequestService;
exports.BookingChangeRequestService = BookingChangeRequestService = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Inject)(email_provider_1.EMAIL_PROVIDER)),
    __metadata("design:paramtypes", [booking_access_service_1.BookingAccessService,
        alerts_service_1.AlertsService,
        audit_log_service_1.AuditLogService, Object])
], BookingChangeRequestService);
//# sourceMappingURL=booking-change-request.service.js.map