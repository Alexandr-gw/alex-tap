import * as React from "react";
import { usePublicSlotsDay } from "../hooks/booking.queries";

type Slot = { start: string; end: string };

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

export function StepDateTimePicker({
                                       wizard,
                                       companyId,
                                       serviceId,
                                   }: {
    wizard: any;
    companyId: string;
    serviceId: string;
}) {
    const day: string | null = wizard.draft.day;

    const [now, setNow] = React.useState(() => new Date());
    React.useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 30_000);
        return () => clearInterval(t);
    }, []);

    const todayKey = isoLocalDateKey(startOfLocalDay(now));

    // default day = today
    React.useEffect(() => {
        if (!day) wizard.dispatch({ type: "SET_DAY", day: todayKey });
    }, [day, todayKey, wizard]);

    const slotsQ = usePublicSlotsDay(day ? { companyId, serviceId, day } : null);
    const rawSlots: Slot[] = slotsQ.data?.slots ?? [];

    // no past times
    const slots = React.useMemo(() => rawSlots.filter((s) => new Date(s.start) > now), [rawSlots, now]);

    return (
        <div className="space-y-4">
            {/* Date picker */}
            <div className="flex flex-wrap items-end justify-between gap-3">
                <label className="grid gap-1">
                    <span className="text-sm text-slate-700">Date</span>
                    <input
                        type="date"
                        className="rounded-xl border border-slate-200 px-3 py-2"
                        value={day ?? ""}
                        min={todayKey}
                        onChange={(e) => wizard.dispatch({ type: "SET_DAY", day: e.target.value || null })}
                    />
                </label>

                <div className="text-xs text-slate-500 pb-2">Times shown in your local timezone</div>
            </div>

            {/* Times */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-900">Choose a time</div>
                </div>

                {slotsQ.isLoading ? <div>Loading slots…</div> : null}
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
                                        selected ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white",
                                        disabled ? "opacity-40 cursor-not-allowed" : "hover:border-slate-400",
                                    ].join(" ")}
                                    onClick={() => wizard.dispatch({ type: "SET_SLOT", slot: { start: s.start, end: s.end } })}
                                >
                                    <div className="text-sm font-medium text-slate-900">{formatTimeLabel(start)}</div>
                                    <div className="text-xs text-slate-600">Ends {formatTimeLabel(end)}</div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-between">
                <button className="rounded-xl border border-slate-200 px-4 py-2" onClick={wizard.back}>
                    Back
                </button>
                <button
                    className="rounded-xl bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
                    disabled={!wizard.draft.slot}
                    onClick={wizard.next}
                >
                    Continue
                </button>
            </div>
        </div>
    );
}