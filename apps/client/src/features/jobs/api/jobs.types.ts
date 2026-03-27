export type JobStatus =
    | 'DRAFT'
    | 'PENDING_CONFIRMATION'
    | 'SCHEDULED'
    | 'IN_PROGRESS'
    | 'DONE'
    | 'CANCELED'
    | 'NO_SHOW';
export type VisitStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELED';
export type PaymentStatus =
    | 'REQUIRES_ACTION'
    | 'PENDING'
    | 'SUCCEEDED'
    | 'FAILED'
    | 'REFUNDED'
    | 'CANCELED';

export type JobClientDto = {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    notes?: string | null;
};

export type JobWorkerDto = {
    id: string;
    name: string;
};

export type JobLineItemDto = {
    id: string;
    name: string;
    quantity: number;
    unitPriceCents: number;
    totalCents: number;
};

export type JobVisitDto = {
    id: string;
    start: string;
    end: string;
    status: VisitStatus;
    assignedWorkers: JobWorkerDto[];
    completed: boolean;
};

export type JobCommentDto = {
    id: string;
    body: string;
    authorName: string;
    createdAt: string;
};

export type JobPaymentDto = {
    id: string;
    status: PaymentStatus;
    amountCents: number;
    currency: string;
    createdAt: string;
    receiptUrl?: string | null;
    sessionId?: string | null;
};

export type JobDetailsDto = {
    id: string;
    jobNumber: string;
    title: string;
    description?: string | null;
    status: JobStatus;
    completed: boolean;
    startAt: string;
    endAt: string;
    location?: string | null;

    client: JobClientDto | null;

    workers: JobWorkerDto[];
    visits: JobVisitDto[];
    lineItems: JobLineItemDto[];
    comments: JobCommentDto[];
    payments: JobPaymentDto[];

    internalNotes?: string | null;

    createdAt: string;
    updatedAt: string;
};

export type JobListItemDto = {
    id: string;
    workerId?: string | null;
    workerIds: string[];
    startAt: string;
    endAt: string;
    status: JobStatus;
    location?: string | null;
    clientName?: string | null;
    clientEmail?: string | null;
    totalCents: number;
    currency?: string | null;
    serviceName?: string | null;
    workerName?: string | null;
    colorTag?: string | null;
};

export type ListJobsParams = {
    status?: JobStatus;
    from?: string;
    to?: string;
    take?: number;
    cursor?: string;
};

export type JobsListResponse = {
    items: JobListItemDto[];
    nextCursor: string | null;
    timezone: string | null;
};

export type UpdateJobInput = {
    title?: string;
    description?: string;
    status?: JobStatus;
    workerId?: string | null;
    workerIds?: string[];
    lineItems?: Array<{
        id?: string;
        name: string;
        quantity: number;
        unitPriceCents: number;
    }>;
};

export type CreateJobCommentInput = {
    body: string;
};

export type UpdateInternalNotesInput = {
    internalNotes: string;
};

export type RequestJobPaymentInput = {
    successUrl?: string;
    cancelUrl?: string;
    idempotencyKey?: string;
};

export type RequestJobPaymentResponse = {
    jobId: string;
    sessionId: string;
    url: string;
    amountCents: number;
    currency: string;
};
