// src/features/services/components/ServiceForm.tsx
import { useMemo, useState } from "react";
import type { ServiceCreateInput, ServiceDto } from "../api/services.types";

function dollarsToCents(input: string) {
    const normalized = input.replace(/[^0-9.]/g, "");
    const n = Number(normalized);
    if (!Number.isFinite(n)) return 0;
    return Math.round(n * 100);
}

function centsToDollars(cents: number) {
    return ((cents ?? 0) / 100).toFixed(2);
}

export function ServiceForm(props: {
    initial?: ServiceDto | null;
    onCancel: () => void;
    onSubmit: (payload: ServiceCreateInput) => void;
    isSubmitting?: boolean;
}) {
    const { initial, onCancel, onSubmit, isSubmitting } = props;

    const [name, setName] = useState(initial?.name ?? "");
    const [priceDollars, setPriceDollars] = useState(centsToDollars(initial?.basePriceCents ?? 0));
    const [durationMins, setDurationMins] = useState(String(initial?.durationMins ?? 60));
    const [currency, setCurrency] = useState(initial?.currency ?? "CAD");
    const [active, setActive] = useState(initial?.active ?? true);

    const canSubmit = useMemo(() => {
        const cents = dollarsToCents(priceDollars);
        const dur = Number(durationMins);
        return name.trim().length >= 2 && cents >= 0 && Number.isFinite(dur) && dur > 0;
    }, [name, priceDollars, durationMins]);

    function submit() {
        if (!canSubmit) return;

        onSubmit({
            name: name.trim(),
            basePriceCents: dollarsToCents(priceDollars),
            durationMins: Number(durationMins),
            currency,
            active,
        });
    }

    return (
        <div className="space-y-4">
            <div>
                <label className="text-xs text-slate-500">Name</label>
                <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                    placeholder="e.g. Standard Cleaning"
                />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                    <label className="text-xs text-slate-500">Price</label>
                    <input
                        value={priceDollars}
                        onChange={(e) => setPriceDollars(e.target.value)}
                        className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                        placeholder="e.g. 129.99"
                        inputMode="decimal"
                    />
                </div>

                <div>
                    <label className="text-xs text-slate-500">Duration (mins)</label>
                    <input
                        value={durationMins}
                        onChange={(e) => setDurationMins(e.target.value)}
                        className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                        inputMode="numeric"
                    />
                </div>

                <div>
                    <label className="text-xs text-slate-500">Currency</label>
                    <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                    >
                        <option value="CAD">CAD</option>
                        <option value="USD">USD</option>
                    </select>
                </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
                <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="h-4 w-4"
                />
                Active (available for new jobs)
            </label>

            <div className="flex justify-end gap-2 pt-2">
                <button
                    onClick={onCancel}
                    className="h-10 rounded-md border border-slate-200 bg-white px-4 text-sm"
                    disabled={isSubmitting}
                >
                    Cancel
                </button>

                <button
                    onClick={submit}
                    disabled={!canSubmit || isSubmitting}
                    className="h-10 rounded-md bg-slate-900 px-4 text-sm text-white disabled:opacity-50"
                >
                    {isSubmitting ? "Saving…" : "Save"}
                </button>
            </div>
        </div>
    );
}
