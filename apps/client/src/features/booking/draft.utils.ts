import { BookingDraftSchema } from "./booking.schema";
import type { BookingDraft } from "./booking.types";

export function bookingDraftKey(companySlug: string) {
    return `bookingDraft:${companySlug}`;
}

export function loadBookingDraft(key: string): BookingDraft | null {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const json = JSON.parse(raw);
        const parsed = BookingDraftSchema.safeParse(json);
        return parsed.success ? parsed.data : null;
    } catch {
        return null;
    }
}

export function saveBookingDraft(key: string, draft: BookingDraft) {
    try {
        localStorage.setItem(key, JSON.stringify(draft));
    } catch (err) {
        if (process.env.NODE_ENV === "development") {
            console.warn("localStorage failed:", err);
        }
    }
}

export function clearBookingDraft(key: string) {
    try {
        localStorage.removeItem(key);
    } catch (err) {
        if (process.env.NODE_ENV === "development") {
            console.warn("localStorage failed:", err);
        }
    }
}