export type PublicServiceDto = {
    companyId: string;
    companyName: string;
    serviceId: string;
    name: string;
    durationMins: number;
    basePriceCents: number;
    currency: string;
};

export type PublicServiceListItemDto = {
    id: string;
    name: string;
    durationMins: number;
    basePriceCents: number;
    currency: string | null;
    slug?: string;
};

export type PublicServicesListDto = {
    companyId: string;
    companyName: string;
    services: PublicServiceListItemDto[];
};

export type PublicSlotsResponse = {
    slots: Array<{
        start: string; // ISO datetime
        end: string;   // ISO datetime
    }>;
};

export type CreateCheckoutInput = {
    companyId: string;
    serviceId: string;
    start: string;
    successUrl?: string;
    cancelUrl?: string;
    client: {
        name: string;
        email?: string;
        phone?: string;
        address?: string;
        notes?: string;
    };
};

export type CreateCheckoutResponse = {
    checkoutUrl: string; // Stripe hosted checkout URL
    sessionId?: string;
    bookingAccessPath?: string;
};

export type PaymentSessionSummaryDto = {
    ok: true;
    status: "REQUIRES_ACTION" | "SUCCEEDED" | "FAILED" | "REFUNDED";
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
};

export type PublicBookingDetailsDto = {
    booking: {
        token: string;
        companyName: string;
        jobId: string;
        status: string;
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
        paymentStatus: string | null;
        paymentAmountCents: number | null;
        requestChangesEmail: string | null;
        expiresAt: string | null;
    };
};

export type RequestBookingChangesResponse = {
    ok: true;
    message: string;
};
