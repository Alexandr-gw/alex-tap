const SCHEDULE_SCROLL_X_KEY = "schedule:scrollX";
const SCHEDULE_DATE_KEY = "schedule:selectedDate";

export function getSavedScheduleScrollX() {
    const raw = localStorage.getItem(SCHEDULE_SCROLL_X_KEY);
    if (!raw) return null;

    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
}

export function saveScheduleScrollX(value: number) {
    localStorage.setItem(SCHEDULE_SCROLL_X_KEY, String(value));
}

export function getSavedScheduleDate() {
    return localStorage.getItem(SCHEDULE_DATE_KEY);
}

export function saveScheduleDate(value: string) {
    localStorage.setItem(SCHEDULE_DATE_KEY, value);
}