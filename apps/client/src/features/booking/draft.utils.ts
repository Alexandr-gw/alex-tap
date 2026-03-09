import { BookingDraftSchema } from "./booking.schema";
import type { BookingDraft } from "./booking.types";

export function bookingDraftKey(companySlug: string) {
    return `bookingDraft:${companySlug}`;
}

const TTL_MS = 24 * 60 * 60 * 1000;

type StoredDraft = {
    v: 1;
    savedAt: number; // ms
    draft: BookingDraft;
};

export function loadBookingDraft(key: string): BookingDraft | null {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;

        const json = JSON.parse(raw) as StoredDraft | BookingDraft;

        if ((json as any).draft && typeof (json as any).savedAt === "number") {
            const stored = json as StoredDraft;

            if (Date.now() - stored.savedAt > TTL_MS) {
                localStorage.removeItem(key);
                return null;
            }

            const parsed = BookingDraftSchema.safeParse(stored.draft);
            return parsed.success ? parsed.data : null;
        }

        const parsed = BookingDraftSchema.safeParse(json);
        return parsed.success ? parsed.data : null;
    } catch {
        return null;
    }
}

export function saveBookingDraft(key: string, draft: BookingDraft) {
    try {
        const stored: StoredDraft = { v: 1, savedAt: Date.now(), draft };
        localStorage.setItem(key, JSON.stringify(stored));
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