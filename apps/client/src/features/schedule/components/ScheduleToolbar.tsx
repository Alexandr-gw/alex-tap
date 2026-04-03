import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDateLabel, getTodayDate, shiftScheduleDate } from "../utils/schedule-time";

type Props = {
    date: string;
    timezone: string;
    unassignedCount?: number;
    onToggleUnassigned?: () => void;
    onChangeDate: (date: string) => void;
};

type CalendarDay = {
    dateKey: string;
    dayNumber: number;
    inCurrentMonth: boolean;
};

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

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

export function ScheduleToolbar({
    date,
    timezone,
    unassignedCount = 0,
    onToggleUnassigned,
    onChangeDate,
}: Props) {
    const todayKey = getTodayDate(timezone);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [calendarMonth, setCalendarMonth] = useState(() => buildMonthDate(date));
    const calendarRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        setCalendarMonth(buildMonthDate(date));
    }, [date]);

    useEffect(() => {
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

    const calendarDays = useMemo(() => buildCalendarDays(calendarMonth), [calendarMonth]);

    return (
        <div className="flex flex-col gap-3 border-b border-emerald-100/80 bg-[linear-gradient(135deg,#ffffff_0%,#f4fbf8_52%,#f3f9ff_100%)] px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onClick={() => onChangeDate(todayKey)}
                    className="rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50"
                >
                    Today
                </button>

                <button
                    type="button"
                    onClick={() => onChangeDate(shiftScheduleDate(date, -1))}
                    className="grid h-12 w-12 place-items-center rounded-2xl border border-sky-100 bg-white text-slate-700 hover:border-sky-200 hover:bg-sky-50"
                    aria-label="Previous day"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>

                <button
                    type="button"
                    onClick={() => onChangeDate(shiftScheduleDate(date, 1))}
                    className="grid h-12 w-12 place-items-center rounded-2xl border border-sky-100 bg-white text-slate-700 hover:border-sky-200 hover:bg-sky-50"
                    aria-label="Next day"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>

                <div className="relative min-w-0 flex-1 sm:min-w-[300px] sm:flex-none" ref={calendarRef}>
                    <button
                        type="button"
                        onClick={() => setIsCalendarOpen((current) => !current)}
                        className="inline-flex h-12 w-full min-w-0 items-center gap-3 rounded-2xl border border-emerald-200 bg-[linear-gradient(135deg,#eefbf4_0%,#eef7ff_100%)] px-5 text-sm font-semibold text-slate-900 hover:border-emerald-300"
                        title="Open calendar"
                        aria-expanded={isCalendarOpen}
                        aria-haspopup="dialog"
                    >
                        <span className="grid h-8 w-8 place-items-center rounded-xl bg-[linear-gradient(135deg,#41be7f_0%,#5ea9f0_100%)] text-white shadow-sm">
                            <CalendarDays className="h-4 w-4" />
                        </span>
                        <span className="truncate">{formatDateLabel(date)}</span>
                        <ChevronDown className="ml-auto h-4 w-4 text-slate-400" />
                    </button>

                    {isCalendarOpen ? (
                        <div className="absolute left-0 top-[calc(100%+0.75rem)] z-30 w-[22rem] max-w-[calc(100vw-2rem)] rounded-[2rem] border border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f9fcff_100%)] p-5 shadow-[0_24px_60px_rgba(15,23,42,0.16)]">
                            <div className="flex items-center justify-between gap-3">
                                <div className="text-[1.75rem] font-semibold tracking-tight text-slate-950">
                                    {formatMonthLabel(calendarMonth)}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setCalendarMonth((current) => shiftMonth(current, -1))}
                                        className="grid h-11 w-11 place-items-center rounded-2xl border border-sky-100 bg-white text-slate-700 hover:border-emerald-200 hover:bg-sky-50"
                                        aria-label="Previous month"
                                    >
                                        <ChevronLeft className="h-5 w-5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCalendarMonth((current) => shiftMonth(current, 1))}
                                        className="grid h-11 w-11 place-items-center rounded-2xl border border-sky-100 bg-white text-slate-700 hover:border-emerald-200 hover:bg-sky-50"
                                        aria-label="Next month"
                                    >
                                        <ChevronRight className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="mt-5 grid grid-cols-7 gap-2">
                                {WEEKDAY_LABELS.map((label) => (
                                    <div
                                        key={label}
                                        className="grid h-10 place-items-center text-sm font-medium text-slate-500"
                                    >
                                        {label}
                                    </div>
                                ))}

                                {calendarDays.map((day) => {
                                    const isSelected = day.dateKey === date;
                                    const isToday = day.dateKey === todayKey;

                                    return (
                                        <button
                                            key={day.dateKey}
                                            type="button"
                                            onClick={() => {
                                                onChangeDate(day.dateKey);
                                                setIsCalendarOpen(false);
                                            }}
                                            className={[
                                                "grid h-12 w-12 place-items-center rounded-2xl border text-base transition",
                                                isSelected
                                                    ? "border-emerald-400 bg-[linear-gradient(135deg,#41be7f_0%,#5ea9f0_100%)] font-semibold text-white shadow-sm"
                                                    : isToday
                                                      ? "border-emerald-200 bg-emerald-50 font-semibold text-emerald-700"
                                                      : day.inCurrentMonth
                                                        ? "border-transparent bg-transparent text-slate-900 hover:border-sky-100 hover:bg-sky-50"
                                                        : "border-transparent bg-transparent text-slate-300 hover:border-sky-100 hover:bg-sky-50",
                                            ].join(" ")}
                                        >
                                            {day.dayNumber}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="mt-5 flex items-center justify-between gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        onChangeDate(todayKey);
                                        setCalendarMonth(buildMonthDate(todayKey));
                                        setIsCalendarOpen(false);
                                    }}
                                    className="rounded-2xl border border-sky-100 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-emerald-200 hover:bg-sky-50"
                                >
                                    Today
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsCalendarOpen(false)}
                                    className="rounded-2xl border border-sky-100 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-emerald-200 hover:bg-sky-50"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>

            <button
                type="button"
                onClick={onToggleUnassigned}
                className="h-12 w-full rounded-2xl border border-sky-100 bg-white px-5 text-sm font-semibold text-slate-700 hover:border-sky-200 hover:bg-sky-50 sm:w-auto sm:shrink-0"
            >
                Unassigned ({unassignedCount})
            </button>
        </div>
    );
}
