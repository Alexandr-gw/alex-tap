import {usePublicSlots} from "../hooks/booking.queries";

export function StepSlotPicker({
                                   wizard,
                                   companyId,
                                   serviceId,
                               }: {
    wizard: any;
    companyId: string;
    serviceId: string;
}) {
    const {from, to} = wizard.draft.range;

    const slotsQ = usePublicSlots(from && to ? {companyId, serviceId, from, to} : null);

    // ✅ FIX: data is { slots: [...] }, not an array directly
    const slots = slotsQ.data?.slots ?? [];

    return (
        <div>
            {slotsQ.isLoading ? <div>Loading slots…</div> : null}
            {slotsQ.isError ? <div className="text-red-600">Failed to load slots.</div> : null}

            <div className="mt-2 grid gap-2">
                {slots.map((s) => {
                    const selected = wizard.draft.slot?.start === s.start;
                    return (
                        <button
                            key={s.start}
                            className={[
                                "rounded-xl border px-3 py-2 text-left",
                                selected ? "border-slate-900 bg-slate-50" : "border-slate-200",
                            ].join(" ")}
                            onClick={() =>
                                wizard.dispatch({type: "SET_SLOT", slot: {start: s.start, end: s.end}})
                            }
                        >
                            <div className="text-sm font-medium text-slate-900">
                                {new Date(s.start).toLocaleString()}
                            </div>
                            <div className="text-xs text-slate-600">Ends: {new Date(s.end).toLocaleString()}</div>
                        </button>
                    );
                })}
            </div>

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