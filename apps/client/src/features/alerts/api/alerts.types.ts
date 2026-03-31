export type AlertStatus = "OPEN" | "RESOLVED";
export type PaymentStatus = "REQUIRES_ACTION" | "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED" | "CANCELED";

export type AlertListItem = {
    id: string;
    type: string;
    status: AlertStatus;
    title: string;
    message: string | null;
    readAt: string | null;
    resolvedAt: string | null;
    createdAt: string;
    job: {
        id: string;
        status: string;
        startAt: string;
        endAt: string;
        paidAt: string | null;
        totalCents: number;
        balanceCents: number;
        currency: string;
        clientName: string;
        clientEmail: string | null;
        workerName: string | null;
        serviceName: string;
        paymentStatus: PaymentStatus | null;
    };
};

export type AlertsListResponse = {
    items: AlertListItem[];
};

export type AlertDetail = {
    id: string;
    type: string;
    status: AlertStatus;
    title: string;
    message: string | null;
    readAt: string | null;
    resolvedAt: string | null;
    createdAt: string;
    resolvedBy: { id: string; name: string } | null;
    job: {
        id: string;
        status: string;
        startAt: string;
        endAt: string;
        paidAt: string | null;
        totalCents: number;
        balanceCents: number;
        currency: string;
        location: string | null;
        source: string | null;
        client: {
            id: string;
            name: string;
            email: string | null;
            phone: string | null;
            address: string | null;
            notes: string | null;
        };
        worker: {
            id: string;
            displayName: string;
            colorTag: string | null;
            phone: string | null;
        } | null;
        workerIds: string[];
        lineItems: Array<{
            id: string;
            description: string;
            quantity: number;
            totalCents: number;
            serviceId: string | null;
            serviceName: string | null;
            serviceDurationMins: number | null;
        }>;
        payments: Array<{
            id: string;
            status: PaymentStatus;
            amountCents: number;
            currency: string;
            receiptUrl: string | null;
            createdAt: string;
        }>;
    };
    workers: Array<{
        id: string;
        displayName: string;
        colorTag: string | null;
        phone: string | null;
    }>;
};

export type UnreadCountResponse = {
    ok: true;
    count: number;
};

export type ReviewJobInput = {
    workerId?: string;
    workerIds?: string[];
    start?: string;
    confirm?: boolean;
    alertId?: string;
};
