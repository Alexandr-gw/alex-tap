export type CreateJobLineItemInput = {
    name: string;
    quantity: number;
    unitPriceCents: number;
};

export type CreateJobClientInput = {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
};

export type CreateJobInput = {
    companyId: string;
    title: string;
    description?: string;
    workerId?: string | null;
    workerIds?: string[];
    clientId?: string;
    client?: CreateJobClientInput;
    start: string;
    end: string;
    lineItems: CreateJobLineItemInput[];
};

export type CreateJobResponse = {
    id: string;
    jobNumber: string;
};
