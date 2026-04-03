import { AlertsService } from '@/alerts/alerts.service';
import { AuditLogService } from '@/observability/audit-log.service';
import { type EmailProvider } from '@/notifications/providers/email.provider';
import { BookingAccessService } from './booking-access.service';
import { RequestBookingChangesDto } from './dto/request-booking-changes.dto';
export declare class BookingChangeRequestService {
    private readonly bookingAccess;
    private readonly alerts;
    private readonly audit;
    private readonly emailProvider;
    constructor(bookingAccess: BookingAccessService, alerts: AlertsService, audit: AuditLogService, emailProvider: EmailProvider);
    requestBookingChanges(token: string, dto?: RequestBookingChangesDto): Promise<{
        ok: boolean;
        message: string;
    }>;
    private sendBookingChangeRequestEmail;
}
