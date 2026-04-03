import { Inject, Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { AlertsService } from '@/alerts/alerts.service';
import { AuditLogService } from '@/observability/audit-log.service';
import { EMAIL_PROVIDER, type EmailProvider } from '@/notifications/providers/email.provider';
import { buildBookingAccessUrl } from './public-booking.utils';
import { BookingAccessService } from './booking-access.service';
import { RequestBookingChangesDto } from './dto/request-booking-changes.dto';

@Injectable()
export class BookingChangeRequestService {
    constructor(
        private readonly bookingAccess: BookingAccessService,
        private readonly alerts: AlertsService,
        private readonly audit: AuditLogService,
        @Inject(EMAIL_PROVIDER)
        private readonly emailProvider: EmailProvider,
    ) {}

    async requestBookingChanges(token: string, dto?: RequestBookingChangesDto) {
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
            accessUrl: buildBookingAccessUrl(booking.token),
            customerMessage,
        });

        return {
            ok: true,
            message: emailSent
                ? 'Your request was sent to the team. They will reach out to confirm the update.'
                : 'Your request was recorded and the team will reach out shortly.',
        };
    }

    private async sendBookingChangeRequestEmail(input: {
        companyName: string;
        clientName: string;
        clientEmail: string | null;
        jobId: string;
        serviceName: string;
        scheduledAt: Date;
        timezone: string;
        accessUrl: string;
        customerMessage: string | null;
    }) {
        const from = process.env.NOTIFY_FROM_EMAIL?.trim();
        if (!from) {
            return false;
        }

        const scheduledFor = DateTime.fromJSDate(input.scheduledAt, { zone: 'utc' })
            .setZone(input.timezone)
            .toLocaleString(DateTime.DATETIME_FULL);

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
}
