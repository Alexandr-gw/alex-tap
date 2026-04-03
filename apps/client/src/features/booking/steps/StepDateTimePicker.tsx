import * as React from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { usePublicSlotsDay } from "../hooks/booking.queries";
import type { BookingWizardController } from "../hooks/useBookingWizard";

type Slot = { start: string; end: string };

type CalendarDay = {
    dateKey: string;
    dayNumber: number;
    inCurrentMonth: boolean;
};

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function pad2(n: number) {
    return String(n).padStart(2, "0");
}

function startOfLocalDay(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function isoLocalDateKey(d: Date) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatTimeLabel(d: Date) {
    return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(d);
}

function parseDateKey(date: string) {
    const [year, month, day] = date.split("-").map(Number);
    return { year, month, day };
}

function buildMonthDate(date: string) {
    const { year, month } = parseDateKey(date);
    return new Date(Date.UTC(year, month - 1, 1, 12, 0, 0));
}

function formatMonthLabel(monthDate: Date) {
    return new Intl.DateTimeFormat(undefined, {
        timeZone: "UTC",
        month: "long",
        year: "numeric",
    }).format(monthDate);
}

function formatSelectedDateLabel(date: string) {
    const { year, month, day } = parseDateKey(date);
    return new Intl.DateTimeFormat(undefined, {
        timeZone: "UTC",
        weekday: "short",
        month: "short",
        day: "numeric",
    }).format(new Date(Date.UTC(year, month - 1, day, 12, 0, 0)));
}

function formatDateKeyFromUtc(date: Date) {
    return date.toISOString().slice(0, 10);
}

function shiftMonth(monthDate: Date, delta: number) {
    const next = new Date(monthDate);
    next.setUTCMonth(next.getUTCMonth() + delta, 1);
    return next;
}

function buildCalendarDays(monthDate: Date) {
    const firstVisible = new Date(monthDate);
    firstVisible.setUTCDate(1 - monthDate.getUTCDay());

    return Array.from({ length: 42 }, (_, index): CalendarDay => {
        const value = new Date(firstVisible);
        value.setUTCDate(firstVisible.getUTCDate() + index);

        return {
            dateKey: formatDateKeyFromUtc(value),
            dayNumber: value.getUTCDate(),
            inCurrentMonth: value.getUTCMonth() === monthDate.getUTCMonth(),
        };
    });
}

export function StepDateTimePicker({
    wizard,
    companyId,
    serviceId,
}: {
    wizard: BookingWizardController;
    companyId: string;
    serviceId: string;
}) {
    const day: string | null = wizard.draft.day;
    const calendarRef = React.useRef<HTMLDivElement | null>(null);

    const [now, setNow] = React.useState(() => new Date());
    const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);

    React.useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 30_000);
        return () => clearInterval(t);
    }, []);

    const todayKey = isoLocalDateKey(startOfLocalDay(now));

    React.useEffect(() => {
        if (!day) wizard.dispatch({ type: "SET_DAY", day: todayKey });
    }, [day, todayKey, wizard]);

    const selectedDay = day ?? todayKey;
    const [calendarMonth, setCalendarMonth] = React.useState(() => buildMonthDate(selectedDay));

    React.useEffect(() => {
        setCalendarMonth(buildMonthDate(selectedDay));
    }, [selectedDay]);

    React.useEffect(() => {
        if (!isCalendarOpen) return undefined;

        function handlePointerDown(event: MouseEvent) {
            if (!calendarRef.current?.contains(event.target as Node)) {
                setIsCalendarOpen(false);
            }
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setIsCalendarOpen(false);
            }
        }

        window.addEventListener("mousedown", handlePointerDown);
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("mousedown", handlePointerDown);
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isCalendarOpen]);

    const calendarDays = React.useMemo(() => buildCalendarDays(calendarMonth), [calendarMonth]);

    const slotsQ = usePublicSlotsDay(selectedDay ? { companyId, serviceId, day: selectedDay } : null);
    const slots = React.useMemo(
        () => (slotsQ.data?.slots ?? []).filter((slot: Slot) => new Date(slot.start) > now),
        [slotsQ.data?.slots, now],
    );

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
                <div className="relative" ref={calendarRef}>
                    <div className="grid gap-1">
                        <span className="text-sm font-medium text-slate-700">Date</span>

                        <button
                            type="button"
                            onClick={() => setIsCalendarOpen((current) => !current)}
                            className="inline-flex min-h-11 min-w-[220px] items-center gap-3 rounded-xl border border-emerald-200 bg-[linear-gradient(135deg,#eefbf4_0%,#eef7ff_100%)] px-3 py-2 text-left text-sm font-medium text-slate-900 hover:border-emerald-300"
                            aria-expanded={isCalendarOpen}
                            aria-haspopup="dialog"
                        >
                            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[linear-gradient(135deg,#41be7f_0%,#5ea9f0_100%)] text-white shadow-sm">
                                <CalendarDays className="h-4 w-4" />
                            </span>
                            <span className="truncate">{formatSelectedDateLabel(selectedDay)}</span>
                            <ChevronDown className="ml-auto h-4 w-4 text-slate-400" />
                        </button>
                    </div>

                    {isCalendarOpen ? (
                        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-20 w-[19rem] rounded-[1.5rem] border border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f9fcff_100%)] p-4 shadow-[0_20px_50px_rgba(15,23,42,0.16)]">
                            <div className="flex items-center justify-between gap-2">
                                <div className="text-lg font-semibold text-slate-950">
                                    {formatMonthLabel(calendarMonth)}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setCalendarMonth((current) => shiftMonth(current, -1))}
                                        className="grid h-9 w-9 place-items-center rounded-xl border border-sky-100 bg-white text-slate-700 hover:border-emerald-200 hover:bg-sky-50"
                                        aria-label="Previous month"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCalendarMonth((current) => shiftMonth(current, 1))}
                                        className="grid h-9 w-9 place-items-center rounded-xl border border-sky-100 bg-white text-slate-700 hover:border-emerald-200 hover:bg-sky-50"
                                        aria-label="Next month"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="mt-4 grid grid-cols-7 gap-1.5">
                                {WEEKDAY_LABELS.map((label) => (
                                    <div
                                        key={label}
                                        className="grid h-8 place-items-center text-xs font-medium text-slate-500"
                                    >
                                        {label}
                                    </div>
                                ))}

                                {calendarDays.map((calendarDay) => {
                                    const isSelected = calendarDay.dateKey === selectedDay;
                                    const isToday = calendarDay.dateKey === todayKey;
                                    const isPast = calendarDay.dateKey < todayKey;

                                    return (
                                        <button
                                            key={calendarDay.dateKey}
                                            type="button"
                                            disabled={isPast}
                                            onClick={() => {
                                                wizard.dispatch({ type: "SET_DAY", day: calendarDay.dateKey });
                                                wizard.dispatch({ type: "SET_SLOT", slot: null });
                                                setIsCalendarOpen(false);
                                            }}
                                            className={[
                                                "grid h-9 w-9 place-items-center rounded-xl border text-sm transition",
                                                isSelected
                                                    ? "border-emerald-400 bg-[linear-gradient(135deg,#41be7f_0%,#5ea9f0_100%)] font-semibold text-white shadow-sm"
                                                    : isToday
                                                      ? "border-emerald-200 bg-emerald-50 font-semibold text-emerald-700"
                                                      : calendarDay.inCurrentMonth
                                                        ? "border-transparent bg-transparent text-slate-900 hover:border-sky-100 hover:bg-sky-50"
                                                        : "border-transparent bg-transparent text-slate-300 hover:border-sky-100 hover:bg-sky-50",
                                                isPast ? "cursor-not-allowed opacity-35 hover:border-transparent hover:bg-transparent" : "",
                                            ].join(" ")}
                                        >
                                            {calendarDay.dayNumber}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="mt-4 flex items-center justify-between gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        wizard.dispatch({ type: "SET_DAY", day: todayKey });
                                        wizard.dispatch({ type: "SET_SLOT", slot: null });
                                        setCalendarMonth(buildMonthDate(todayKey));
                                        setIsCalendarOpen(false);
                                    }}
                                    className="rounded-xl border border-sky-100 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-emerald-200 hover:bg-sky-50"
                                >
                                    Today
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsCalendarOpen(false)}
                                    className="rounded-xl border border-sky-100 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-emerald-200 hover:bg-sky-50"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    ) : null}
                </div>

                <div className="pb-0 text-xs text-slate-500 sm:pb-2">Times shown in your local timezone</div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-900">Choose a time</div>
                </div>

                {slotsQ.isLoading ? <div>Loading slots...</div> : null}
                {slotsQ.isError ? <div className="text-red-600">Failed to load slots.</div> : null}

                {!slotsQ.isLoading && slots.length === 0 ? (
                    <div className="text-sm text-slate-600">No available times for this day.</div>
                ) : (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                        {slots.map((s) => {
                            const start = new Date(s.start);
                            const end = new Date(s.end);
                            const selected = wizard.draft.slot?.start === s.start;
                            const disabled = start <= now;

                            return (
                                <button
                                    key={s.start}
                                    type="button"
                                    disabled={disabled}
                                    className={[
                                        "rounded-xl border px-3 py-2 text-left",
                                        selected
                                            ? "border-slate-900 bg-slate-50"
                                            : "border-slate-200 bg-white",
                                        disabled ? "cursor-not-allowed opacity-40" : "hover:border-slate-400",
                                    ].join(" ")}
                                    onClick={() =>
                                        wizard.dispatch({ type: "SET_SLOT", slot: { start: s.start, end: s.end } })
                                    }
                                >
                                    <div className="text-sm font-medium text-slate-900">{formatTimeLabel(start)}</div>
                                    <div className="text-xs text-slate-600">Ends {formatTimeLabel(end)}</div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <button className="w-full rounded-xl border border-slate-200 px-4 py-2 sm:w-auto" onClick={wizard.back}>
                    Back
                </button>
                <button
                    className="w-full rounded-xl bg-slate-900 px-4 py-2 text-white disabled:opacity-50 sm:w-auto"
                    disabled={!wizard.draft.slot}
                    onClick={wizard.next}
                >
                    Continue
                </button>
            </div>
        </div>
    );
}
