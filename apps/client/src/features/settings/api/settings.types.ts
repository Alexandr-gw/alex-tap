export type WorkerRole = "ADMIN" | "MANAGER" | "WORKER" | "CLIENT";

export type CompanySettingsDto = {
    id: string;
    name: string;
    timezone: string;
    bookingSlug?: string | null;
    updatedAt: string;
};

export type UpdateCompanySettingsInput = {
    name: string;
    timezone: string;
    bookingSlug?: string;
};

export type WorkerListItemDto = {
    id: string;
    name: string;
    phone?: string | null;
    colorTag?: string | null;
    active: boolean;
    linkedUserEmail?: string | null;
    role?: WorkerRole | null;
    createdAt?: string;
};

export type WorkersListParams = {
    search?: string;
    page?: number;
    limit?: number;
};

export type WorkersListMeta = {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
};

export type WorkersListResponse = {
    items: WorkerListItemDto[];
    meta: WorkersListMeta;
};

export type CreateWorkerInput = {
    name: string;
    phone?: string;
    colorTag?: string;
    active?: boolean;
};

export type UpdateWorkerInput = {
    name: string;
    phone?: string;
    colorTag?: string;
    active?: boolean;
    role?: "MANAGER" | "WORKER";
};
