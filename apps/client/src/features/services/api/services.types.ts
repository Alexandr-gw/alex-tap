// src/features/services/api/services.types.ts
export type ServiceDto = {
    id: string;
    companyId: string;

    name: string;
    active: boolean;

    basePriceCents: number;
    durationMins: number;
    currency: string;

    stripeProductId: string | null;
    stripePriceId: string | null;

    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
};

export type ServicesListResponse = {
    items: ServiceDto[];
    page: number;
    pageSize: number;
    total: number;
};

export type ServicesListParams = {
    search?: string;
    page?: number;
    pageSize?: number;
    sort?: string; // e.g. "name" or "-updatedAt"
    active?: boolean; // true/false/undefined
};

export type ServiceCreateInput = {
    name: string;
    basePriceCents: number;
    durationMins: number;
    currency?: string;
    active?: boolean;
    stripeProductId?: string | null;
    stripePriceId?: string | null;
};

export type ServiceUpdateInput = Partial<ServiceCreateInput>;
