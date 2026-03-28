export type ISODate = string; // "2026-02-23"
export type ISODateTime = string; // "2026-02-23T16:30:00.000Z"

export type BookingRange = {
    from: ISODate | null;
    to: ISODate | null;
};

export type BookingSlot = {
    start: ISODateTime;
    end: ISODateTime;
};

export type BookingClientDraft = {
    name: string;
    email?: string;
    phone?: string;
    addressLine1?: string;
    addressLine2?: string;
    notes?: string;
};

export type BookingDraftStatus = "active" | "completed";

export type BookingDraft = {
    bookingIntentId: string;
    day: ISODate | null; // "YYYY-MM-DD"
    stepIndex: number;
    serviceId: string | null;

    // keep for now (legacy / optional)
    range: BookingRange;
    slot: BookingSlot | null;
    client: BookingClientDraft;

    status?: BookingDraftStatus;
    updatedAt?: number;
    completedAt?: number | null;
};

export type WizardStepId =
    | "service"
    | "datetime"
    | "client"
    | "confirm";

export const WIZARD_STEPS: WizardStepId[] = [
    "service",
    "datetime",
    "client",
    "confirm",
];
