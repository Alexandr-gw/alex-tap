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
    }>;
}
