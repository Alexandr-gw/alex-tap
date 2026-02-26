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
};
