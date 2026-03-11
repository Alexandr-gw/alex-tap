import type { BookingDraft, BookingRange, BookingSlot, BookingClientDraft, ISODate } from "./booking.types";

export const bookingInitialDraft: BookingDraft = {
    day: null,
    stepIndex: 0,
    serviceId: null,

    range: { from: null, to: null },
    slot: null,
    client: { name: "" },

    status: "active",
    updatedAt: undefined,
    completedAt: null,
};

export type BookingAction =
    | { type: "SET_STEP"; stepIndex: number }
    | { type: "SET_DAY"; day: ISODate | null }
    | { type: "SET_RANGE"; range: BookingRange }
    | { type: "SET_SLOT"; slot: BookingSlot | null }
    | { type: "SET_CLIENT"; client: BookingClientDraft }
    | { type: "RESET"; draft?: BookingDraft }
    | { type: "SET_SERVICE"; serviceId: string }
    | { type: "MARK_COMPLETED"; completedAt?: number };

export function bookingReducer(state: BookingDraft, action: BookingAction): BookingDraft {
    switch (action.type) {
        case "SET_STEP":
            return { ...state, stepIndex: action.stepIndex, status: "active", completedAt: null };

        case "SET_DAY":
            return {
                ...state,
                day: action.day,
                slot: null,
                status: "active",
                completedAt: null,
            };

        case "SET_RANGE":
            return { ...state, range: action.range, status: "active", completedAt: null };

        case "SET_SLOT":
            return { ...state, slot: action.slot, status: "active", completedAt: null };

        case "SET_CLIENT":
            return { ...state, client: action.client, status: "active", completedAt: null };

        case "RESET":
            return action.draft ?? bookingInitialDraft;

        case "SET_SERVICE":
            return {
                ...state,
                serviceId: action.serviceId,
                day: null,
                range: { from: null, to: null },
                slot: null,
                stepIndex: 1,
                status: "active",
                completedAt: null,
            };

        case "MARK_COMPLETED":
            return {
                ...state,
                status: "completed",
                completedAt: action.completedAt ?? Date.now(),
            };

        default:
            return state;
    }
}
