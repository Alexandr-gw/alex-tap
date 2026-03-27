import { PrismaService } from '@/prisma/prisma.service';
import { SlotsService } from '@/slots/slots.service';
import { PaymentsService } from '@/payments/payments.service';
import { ActivityService } from '@/activity/activity.service';
import { AlertsService } from '@/alerts/alerts.service';
import { AuditLogService } from '@/observability/audit-log.service';
import { type EmailProvider } from '@/notifications/providers/email.provider';
import { PublicCheckoutDto } from './dto/public-checkout.dto';
export declare class PublicBookingService {
    private readonly prisma;
    private readonly slots;
    private readonly payments;
    private readonly activity;
    private readonly alerts;
    private readonly audit;
    private readonly emailProvider;
    constructor(prisma: PrismaService, slots: SlotsService, payments: PaymentsService, activity: ActivityService, alerts: AlertsService, audit: AuditLogService, emailProvider: EmailProvider);
    getPublicService(companySlug: string, serviceSlug: string): Promise<{
        companyId: string;
        companyName: string;
        serviceId: string;
        name: string;
        durationMins: number;
        basePriceCents: number;
        currency: string;
    }>;
    getPublicSlots(args: {
        companyId: string;
        serviceId: string;
        from: string;
        to: string;
    }): Promise<{
        start: string;
        end: string;
    }[]>;
    createPublicCheckout(dto: PublicCheckoutDto): Promise<{
        checkoutUrl: string;
        jobId: string;
        bookingAccessPath: string;
    }>;
    listPublicServices(companySlug: string): Promise<{
        companyId: string;
        companyName: string;
        services: {
            id: string;
            currency: string;
            name: string;
            slug: string | null;
            durationMins: number;
            basePriceCents: number;
        }[];
    }>;
    getBookingByAccessToken(token: string): Promise<{
        booking: {
            token: string;
            companyName: string;
            jobId: string;
            status: import("@prisma/client").$Enums.JobStatus;
            title: string;
            serviceName: string;
            scheduledAt: string;
            endsAt: string;
            timezone: string;
            clientName: string;
            clientEmail: string | null;
            location: string | null;
            workerName: string | null;
            totalCents: number;
            currency: string;
            notes: string | null;
            paymentStatus: import("@prisma/client").$Enums.PaymentStatus | null;
            paymentAmountCents: number | null;
            requestChangesEmail: string | null;
            expiresAt: string | null;
        };
    }>;
    requestBookingChanges(token: string): Promise<{
        ok: boolean;
        message: string;
    }>;
    ensureBookingAccessLink(companyId: string, jobId: string): Promise<{
        companyId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        jobId: string;
        expiresAt: Date | null;
        token: string;
    }>;
    private findBookingAccessLink;
    private sendBookingChangeRequestEmail;
    private acquireCompanyDayBookingLock;
    private withSerializableRetry;
    private isRetryableTransactionError;
}
