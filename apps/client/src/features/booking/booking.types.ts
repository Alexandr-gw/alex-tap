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
    notes?: string;
};

export type BookingDraft = {
    stepIndex: number;
    serviceId: string | null;

    range: BookingRange;
    slot: BookingSlot | null;
    client: BookingClientDraft;
};

export type WizardStepId =
    | "service"
    | "range"
    | "slot"
    | "client"
    | "confirm";

export const WIZARD_STEPS: WizardStepId[] = [
    "service",
    "range",
    "slot",
    "client",
    "confirm",
];