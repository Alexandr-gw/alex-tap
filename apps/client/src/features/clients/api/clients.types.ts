export type ClientListItemDto = {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    jobsCount: number;
    lastJobAt?: string | null;
    createdAt: string;
};

export type ClientsListParams = {
    search?: string;
    page?: number;
    limit?: number;
};

export type ClientsListMeta = {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
};

export type ClientsListResponse = {
    items: ClientListItemDto[];
    meta: ClientsListMeta;
};

export type ClientJobDto = {
    id: string;
    title?: string | null;
    status: string;
    workerName?: string | null;
    start?: string | null;
    totalAmountCents?: number | null;
};

export type ClientTaskDto = {
    id: string;
    subject: string;
    completed: boolean;
    dueAt?: string | null;
    assignedWorkerName?: string | null;
};

export type ClientPaymentDto = {
    id: string;
    amountCents: number;
    status: string;
    provider?: string | null;
    paidAt?: string | null;
    jobId?: string | null;
};

export type ClientLastCommunicationDto = {
    channel: 'EMAIL';
    type: 'CONFIRMATION' | 'REMINDER_24H' | 'REMINDER_1H';
    label: string;
    sentAt: string;
    recipient?: string | null;
    jobId: string;
};

export type ClientDetailsDto = {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    customerComments?: string | null;
    internalNotes?: string | null;
    createdAt: string;
    updatedAt: string;
    lastCommunication?: ClientLastCommunicationDto | null;
    jobs: ClientJobDto[];
    tasks: ClientTaskDto[];
    payments: ClientPaymentDto[];
};

export type CreateClientInput = {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    internalNotes?: string;
};

export type UpdateClientInput = {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    internalNotes?: string;
};

