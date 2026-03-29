import { BookingDraftSchema } from "./booking.schema";
import type { BookingDraft } from "./booking.types";

export function bookingDraftKey(companySlug: string) {
    return `bookingDraft:${companySlug}`;
}

export function companySlugFromBookingDraftKey(key: string | null | undefined) {
    if (!key?.startsWith("bookingDraft:")) {
        return null;
    }

    const slug = key.slice("bookingDraft:".length).trim();
    return slug || null;
}

const TTL_MS = 24 * 60 * 60 * 1000;
const LAST_BOOKING_DRAFT_KEY = "bookingDraft:lastActiveKey";

type StoredDraft = {
    v: 1;
    savedAt: number; // ms
    draft: BookingDraft;
};

function isStoredDraftCandidate(value: unknown): value is StoredDraft {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const candidate = value as Partial<StoredDraft>;
    return typeof candidate.savedAt === "number" && "draft" in candidate;
}

function readStoredDraft(key: string): StoredDraft | null {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;

        const json = JSON.parse(raw) as StoredDraft | BookingDraft;

        if (isStoredDraftCandidate(json)) {
            return json;
        }

        const parsed = BookingDraftSchema.safeParse(json);
        if (!parsed.success) return null;

        return {
            v: 1,
            savedAt: Date.now(),
            draft: parsed.data,
        };
    } catch {
        return null;
    }
}

export function loadBookingDraft(key: string): BookingDraft | null {
    const stored = readStoredDraft(key);
    if (!stored) return null;

    if (Date.now() - stored.savedAt > TTL_MS) {
        clearBookingDraft(key);
        return null;
    }

    const parsed = BookingDraftSchema.safeParse(stored.draft);
    return parsed.success ? parsed.data : null;
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
        if (localStorage.getItem(LAST_BOOKING_DRAFT_KEY) === key) {
            localStorage.removeItem(LAST_BOOKING_DRAFT_KEY);
        }
    } catch (err) {
        if (process.env.NODE_ENV === "development") {
            console.warn("localStorage failed:", err);
        }
    }
}

export function setLastActiveBookingDraftKey(key: string) {
    try {
        localStorage.setItem(LAST_BOOKING_DRAFT_KEY, key);
    } catch (err) {
        if (process.env.NODE_ENV === "development") {
            console.warn("localStorage failed:", err);
        }
    }
}

export function getLastActiveBookingDraftKey() {
    try {
        return localStorage.getItem(LAST_BOOKING_DRAFT_KEY);
    } catch {
        return null;
    }
}

export function getLastActiveBookingSlug() {
    return companySlugFromBookingDraftKey(getLastActiveBookingDraftKey());
}

export function clearLastActiveBookingDraftKey() {
    try {
        localStorage.removeItem(LAST_BOOKING_DRAFT_KEY);
    } catch (err) {
        if (process.env.NODE_ENV === "development") {
            console.warn("localStorage failed:", err);
        }
    }
}

export function markBookingDraftCompleted(key: string) {
    const stored = readStoredDraft(key);
    if (!stored) return;

    saveBookingDraft(key, {
        ...stored.draft,
        status: "completed",
        updatedAt: Date.now(),
        completedAt: Date.now(),
    });
}
