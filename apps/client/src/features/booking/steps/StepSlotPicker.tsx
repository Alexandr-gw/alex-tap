import * as React from "react";
import { usePublicSlotsDay } from "../hooks/booking.queries";
import type { BookingWizardController } from "../hooks/useBookingWizard";

type Slot = { start: string; end: string };

function pad2(n: number) {
    return String(n).padStart(2, "0");
}

function startOfLocalDay(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function sameLocalDay(a: Date, b: Date) {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

function isoLocalDateKey(d: Date) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatDayLabel(d: Date) {
    return new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
    }).format(d);
}

function formatTimeLabel(d: Date) {
    return new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
    }).format(d);
}

export function StepSlotPicker({
    wizard,
    companyId,
    serviceId,
}: {
    wizard: BookingWizardController;
    companyId: string;
    serviceId: string;
}) {
    const [now, setNow] = React.useState(() => new Date());

    React.useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 30_000);
        return () => clearInterval(t);
    }, []);

    const today0 = React.useMemo(() => startOfLocalDay(now), [now]);
    const day = wizard.draft.day ?? isoLocalDateKey(today0);

    React.useEffect(() => {
        if (!wizard.draft.day) {
            wizard.dispatch({ type: "SET_DAY", day });
        }
    }, [day, wizard]);

    const days = React.useMemo(() => {
        return Array.from({ length: 7 }, (_, i) => {
            const date = new Date(today0);
            date.setDate(date.getDate() + i);
            return date;
        });
    }, [today0]);

    const [selectedDayKey, setSelectedDayKey] = React.useState<string>(day);

    React.useEffect(() => {
        if (day !== selectedDayKey) {
            setSelectedDayKey(day);
        }
    }, [day, selectedDayKey]);

    React.useEffect(() => {
        const isVisible = days.some((date) => isoLocalDateKey(date) === selectedDayKey);
        if (!isVisible) {
            const todayKey = isoLocalDateKey(today0);
            setSelectedDayKey(todayKey);
            wizard.dispatch({ type: "SET_DAY", day: todayKey });
        }
    }, [days, selectedDayKey, today0, wizard]);

    const slotsQ = usePublicSlotsDay(
        companyId && serviceId && selectedDayKey
            ? { companyId, serviceId, day: selectedDayKey }
            : null,
    );

    const selectedSlots = React.useMemo(() => {
        return (slotsQ.data?.slots ?? [])
            .filter((slot: Slot) => new Date(slot.start) > now)
            .sort((a, b) => +new Date(a.start) - +new Date(b.start));
    }, [slotsQ.data?.slots, now]);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
                {days.map((date) => {
                    const key = isoLocalDateKey(date);
                    const isSelected = key === selectedDayKey;

                    return (
                        <button
                            key={key}
                            type="button"
                            onClick={() => {
                                setSelectedDayKey(key);
                                wizard.dispatch({ type: "SET_DAY", day: key });
                            }}
                            className={[
                                "rounded-xl border px-3 py-2 text-sm",
                                isSelected
                                    ? "border-slate-900 bg-slate-900 text-white"
                                    : "border-slate-200 bg-white",
                            ].join(" ")}
                        >
                            <div className="font-medium">
                                {sameLocalDay(date, now) ? "Today" : formatDayLabel(date)}
                            </div>
                            <div className="text-xs opacity-80">
                                {isSelected && slotsQ.isLoading ? "Loading..." : "Select"}
                            </div>
                        </button>
                    );
                })}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-900">Choose a time</div>
                    <div className="text-xs text-slate-500">Times shown in your local timezone</div>
                </div>

                {slotsQ.isError ? (
                    <div className="text-red-600">Failed to load slots.</div>
                ) : slotsQ.isLoading ? (
                    <div>Loading slots...</div>
                ) : selectedSlots.length === 0 ? (
                    <div className="text-sm text-slate-600">
                        No available times for this day. Try another day.
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                        {selectedSlots.map((slot) => {
                            const start = new Date(slot.start);
                            const end = new Date(slot.end);
                            const isSelected = wizard.draft.slot?.start === slot.start;

                            return (
                                <button
                                    key={slot.start}
                                    type="button"
                                    className={[
                                        "rounded-xl border px-3 py-2 text-left",
                                        isSelected
                                            ? "border-slate-900 bg-slate-50"
                                            : "border-slate-200 bg-white hover:border-slate-400",
                                    ].join(" ")}
                                    onClick={() =>
                                        wizard.dispatch({
                                            type: "SET_SLOT",
                                            slot: { start: slot.start, end: slot.end },
                                        })
                                    }
                                >
                                    <div className="text-sm font-medium text-slate-900">
                                        {formatTimeLabel(start)}
                                    </div>
                                    <div className="text-xs text-slate-600">Ends {formatTimeLabel(end)}</div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="mt-6 flex justify-between">
                <button
                    className="rounded-xl border border-slate-200 px-4 py-2"
                    onClick={wizard.back}
                    type="button"
                >
                    Back
                </button>
                <button
                    className="rounded-xl bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
                    disabled={!wizard.draft.slot}
                    onClick={wizard.next}
                    type="button"
                >
                    Continue
                </button>
            </div>
        </div>
    );
}
