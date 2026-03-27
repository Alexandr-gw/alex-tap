import { PublicBookingService } from "./public-booking.service";
import { PublicCheckoutDto } from "./dto/public-checkout.dto";
import { PaymentsService } from "@/payments/payments.service";
export declare class PublicBookingController {
    private readonly svc;
    private readonly payments;
    constructor(svc: PublicBookingService, payments: PaymentsService);
    getService(companySlug: string, serviceSlug: string): Promise<{
        companyId: string;
        companyName: string;
        serviceId: string;
        name: string;
        durationMins: number;
        basePriceCents: number;
        currency: string;
    }>;
    getSlots(companyId?: string, serviceId?: string, from?: string, to?: string): Promise<{
        start: string;
        end: string;
    }[]>;
    listServices(companySlug: string): Promise<{
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
    checkout(dto: PublicCheckoutDto): Promise<{
        checkoutUrl: string;
        jobId: string;
        bookingAccessPath: string;
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
    getPublicCheckoutSessionSummary(sessionId: string): Promise<{
        ok: true;
        status: import("@prisma/client").PaymentStatus;
        amountCents: number;
        currency: string;
        jobId: string;
        serviceName: string;
        clientName: string | null;
        scheduledAt: string | null;
        receiptUrl?: string | null;
        paymentId?: string;
        customerMessage?: string | null;
        bookingAccessPath?: string | null;
    }>;
}
