export const HOUR_WIDTH = 96;
export const MINUTES_IN_DAY = 24 * 60;
export const PX_PER_MINUTE = HOUR_WIDTH / 60;

type TimeZoneParts = {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
};

function getFormatter(timeZone: string) {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
    });
}

function getTimeZoneParts(date: Date, timeZone: string): TimeZoneParts {
    const parts = getFormatter(timeZone).formatToParts(date);
    const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));

    return {
        year: Number(lookup.year),
        month: Number(lookup.month),
        day: Number(lookup.day),
        hour: Number(lookup.hour),
        minute: Number(lookup.minute),
        second: Number(lookup.second),
    };
}

function parseDateKey(date: string) {
    const [year, month, day] = date.split("-").map(Number);
    return { year, month, day };
}

export function getTodayDate(timeZone: string) {
    const parts = getTimeZoneParts(new Date(), timeZone);
    return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function getMinutesFromIso(iso: string, timeZone: string) {
    const parts = getTimeZoneParts(new Date(iso), timeZone);
    return parts.hour * 60 + parts.minute;
}

export function getCurrentMinutes(timeZone: string) {
    const parts = getTimeZoneParts(new Date(), timeZone);
    return parts.hour * 60 + parts.minute;
}

export function clampMinutesToDay(minutes: number) {
    return Math.max(0, Math.min(MINUTES_IN_DAY, minutes));
}

export function minutesToLeft(minutes: number) {
    return clampMinutesToDay(minutes) * PX_PER_MINUTE;
}

export function durationToWidth(startMinutes: number, endMinutes: number) {
    const safeStart = clampMinutesToDay(startMinutes);
    const safeEnd = clampMinutesToDay(endMinutes);
    return Math.max((safeEnd - safeStart) * PX_PER_MINUTE, 24);
}

export function formatTimeLabel(iso: string, timeZone: string) {
    const parts = getTimeZoneParts(new Date(iso), timeZone);
    return `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

export function formatMinutesLabel(totalMinutes: number) {
    const mins = clampMinutesToDay(totalMinutes);
    const hh = String(Math.floor(mins / 60)).padStart(2, "0");
    const mm = String(mins % 60).padStart(2, "0");
    return `${hh}:${mm}`;
}

export function formatDateLabel(date: string) {
    const { year, month, day } = parseDateKey(date);
    return new Intl.DateTimeFormat(undefined, {
        timeZone: "UTC",
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(new Date(Date.UTC(year, month - 1, day, 12, 0, 0)));
}

export function snapMinutes(minutes: number, step = 15) {
    return Math.max(0, Math.min(24 * 60, Math.round(minutes / step) * step));
}

export function shiftScheduleDate(date: string, days: number) {
    const { year, month, day } = parseDateKey(date);
    const value = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    value.setUTCDate(value.getUTCDate() + days);
    return value.toISOString().slice(0, 10);
}

export function buildScheduleInstant(date: string, totalMinutes: number, timeZone: string) {
    const mins = clampMinutesToDay(totalMinutes);
    const { year, month, day } = parseDateKey(date);
    const hour = Math.floor(mins / 60);
    const minute = mins % 60;

    let guess = Date.UTC(year, month - 1, day, hour, minute, 0);

    for (let i = 0; i < 4; i += 1) {
        const parts = getTimeZoneParts(new Date(guess), timeZone);
        const observed = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
        const desired = Date.UTC(year, month - 1, day, hour, minute, 0);
        const diff = desired - observed;
        if (diff === 0) break;
        guess += diff;
    }

    return new Date(guess).toISOString();
}

export function minutesDeltaFromPixels(deltaPx: number) {
    return deltaPx / PX_PER_MINUTE;
}

export function snapDeltaMinutes(minutes: number, step = 15) {
    return Math.round(minutes / step) * step;
}
