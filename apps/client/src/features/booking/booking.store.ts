import type { BookingDraft, BookingRange, BookingSlot, BookingClientDraft, ISODate } from "./booking.types";

export const bookingInitialDraft: BookingDraft = {
    day: null,
    stepIndex: 0,
    serviceId: null,

    range: { from: null, to: null },
    slot: null,
    client: { name: "" },
};

export type BookingAction =
    | { type: "SET_STEP"; stepIndex: number }
    | { type: "SET_DAY"; day: ISODate | null }
    | { type: "SET_RANGE"; range: BookingRange }
    | { type: "SET_SLOT"; slot: BookingSlot | null }
    | { type: "SET_CLIENT"; client: BookingClientDraft }
    | { type: "RESET"; draft?: BookingDraft }
    | { type: "SET_SERVICE"; serviceId: string };

export function bookingReducer(state: BookingDraft, action: BookingAction): BookingDraft {
    switch (action.type) {
        case "SET_STEP":
            return { ...state, stepIndex: action.stepIndex };

        case "SET_DAY":
            return {
                ...state,
                day: action.day,
                slot: null,
            };

        case "SET_RANGE":
            return { ...state, range: action.range };

        case "SET_SLOT":
            return { ...state, slot: action.slot };

        case "SET_CLIENT":
            return { ...state, client: action.client };

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
            };

        default:
            return state;
    }
}