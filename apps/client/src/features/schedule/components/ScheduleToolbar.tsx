import { useRef } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDateLabel, getTodayDate, shiftScheduleDate } from "../utils/schedule-time";

type Props = {
    date: string;
    timezone: string;
    unassignedCount?: number;
    onToggleUnassigned?: () => void;
    onChangeDate: (date: string) => void;
};

export function ScheduleToolbar({
    date,
    timezone,
    unassignedCount = 0,
    onToggleUnassigned,
    onChangeDate,
}: Props) {
    const dateInputRef = useRef<HTMLInputElement | null>(null);

    function openDatePicker() {
        const input = dateInputRef.current;
        if (!input) return;

        if (typeof input.showPicker === "function") {
            input.showPicker();
            return;
        }

        input.focus();
        input.click();
    }

    return (
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
                <input
                    ref={dateInputRef}
                    type="date"
                    value={date}
                    onChange={(e) => onChangeDate(e.target.value)}
                    className="sr-only"
                    aria-hidden="true"
                    tabIndex={-1}
                />

                <button
                    type="button"
                    onClick={() => onChangeDate(getTodayDate(timezone))}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700"
                >
                    Today
                </button>

                <button
                    type="button"
                    onClick={() => onChangeDate(shiftScheduleDate(date, -1))}
                    className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700"
                    aria-label="Previous day"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>

                <button
                    type="button"
                    onClick={() => onChangeDate(shiftScheduleDate(date, 1))}
                    className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700"
                    aria-label="Next day"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>

                <button
                    type="button"
                    onClick={openDatePicker}
                    className="inline-flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 sm:flex-none"
                    title="Open calendar"
                >
                    <CalendarDays className="h-4 w-4 text-slate-500" />
                    <span className="truncate">{formatDateLabel(date)}</span>
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                </button>
            </div>

            <button
                type="button"
                onClick={onToggleUnassigned}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 sm:w-auto sm:shrink-0"
            >
                Unassigned ({unassignedCount})
            </button>
        </div>
    );
}
