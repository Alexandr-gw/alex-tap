import { Inject, Injectable, Optional } from '@nestjs/common';
import { AlertsService } from '@/alerts/alerts.service';
import { ActivityService } from '@/activity/activity.service';
import { AuditLogService } from '@/observability/audit-log.service';
import { PaymentsService } from '@/payments/payments.service';
import { PrismaService } from '@/prisma/prisma.service';
import { SlotsService } from '@/slots/slots.service';
import { EMAIL_PROVIDER, type EmailProvider } from '@/notifications/providers/email.provider';
import { BookingAccessService } from './booking-access.service';
import { BookingChangeRequestService } from './booking-change-request.service';
import { PublicAvailabilityService } from './public-availability.service';
import { PublicBookingCheckoutService } from './public-booking-checkout.service';
import { PublicBookingPersistenceService } from './public-booking-persistence.service';
import { PublicCatalogService } from './public-catalog.service';
import { PublicCheckoutDto } from './dto/public-checkout.dto';
import { RequestBookingChangesDto } from './dto/request-booking-changes.dto';

@Injectable()
export class PublicBookingService {
    private readonly catalog: PublicCatalogService;
    private readonly availability: PublicAvailabilityService;
    private readonly checkout: PublicBookingCheckoutService;
    private readonly bookingAccess: BookingAccessService;
    private readonly bookingChangeRequests: BookingChangeRequestService;
    private readonly persistence: PublicBookingPersistenceService;

    constructor(
        prisma: PrismaService,
        slots: SlotsService,
        payments: PaymentsService,
        activity: ActivityService,
        alerts: AlertsService,
        @Optional() audit?: AuditLogService,
        @Optional() @Inject(EMAIL_PROVIDER) emailProvider?: EmailProvider,
    ) {
        this.catalog = new PublicCatalogService(prisma);
        this.availability = new PublicAvailabilityService(prisma, slots);
        this.persistence = new PublicBookingPersistenceService(prisma, slots);
        this.bookingAccess = new BookingAccessService(prisma);
        this.checkout = new PublicBookingCheckoutService(
            this.persistence,
            payments,
            activity,
            this.bookingAccess,
        );
        this.bookingChangeRequests = new BookingChangeRequestService(
            this.bookingAccess,
            alerts,
            audit as AuditLogService,
            emailProvider as EmailProvider,
        );
    }

    async getPublicService(companySlug: string, serviceSlug: string) {
        return this.catalog.getPublicService(companySlug, serviceSlug);
    }

    async getPublicSlots(args: { companyId: string; serviceId: string; from: string; to: string }) {
        return this.availability.getPublicSlots(args);
    }

    async createPublicCheckout(dto: PublicCheckoutDto) {
        return this.checkout.createPublicCheckout(dto);
    }

    async listPublicServices(companySlug: string) {
        return this.catalog.listPublicServices(companySlug);
    }

    async getBookingByAccessToken(token: string) {
        return this.bookingAccess.getBookingByAccessToken(token);
    }

    async requestBookingChanges(token: string, dto?: RequestBookingChangesDto) {
        return this.bookingChangeRequests.requestBookingChanges(token, dto);
    }

    async ensureBookingAccessLink(companyId: string, jobId: string) {
        return this.bookingAccess.ensureBookingAccessLink(companyId, jobId);
    }

    private async findBookingAccessLink(token: string) {
        return this.bookingAccess.findBookingAccessLink(token);
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
        return (this.bookingChangeRequests as any).sendBookingChangeRequestEmail(input);
    }

    private async withSerializableRetry<T>(operation: () => Promise<T>, maxAttempts = 3): Promise<T> {
        return (this.persistence as any).withSerializableRetry(operation, maxAttempts);
    }

    private isRetryableTransactionError(error: unknown) {
        return (this.persistence as any).isRetryableTransactionError(error);
    }
}
