export type ActivityEventType =
    | "JOB_CREATED"
    | "JOB_COMPLETED"
    | "JOB_CANCELED"
    | "CLIENT_CREATED"
    | "BOOKING_SUBMITTED"
    | "PAYMENT_SUCCEEDED"
    | "INVOICE_SENT";

export type ActivityActorType = "USER" | "PUBLIC" | "SYSTEM";

export type ActivityEntityType = "job" | "client" | "payment" | "invoice" | string;

export type ActivityMetadata = Record<string, unknown> | null;

export type ActivityItem = {
    id: string;
    type: ActivityEventType;
    actorType: ActivityActorType;
    actorId?: string | null;
    actorLabel: string | null;
    entityType: ActivityEntityType;
    entityId: string;
    jobId?: string | null;
    clientId?: string | null;
    createdAt: string;
    message?: string | null;
    metadata?: ActivityMetadata;
};

export type JobActivityResponse = ActivityItem[];
export type RecentActivityResponse = ActivityItem[];
