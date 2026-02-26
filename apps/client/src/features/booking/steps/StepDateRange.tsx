export function StepDateRange({wizard}: { wizard: any }) {
    const {from, to} = wizard.draft.range;

    return (
        <div>
            <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1">
                    <span className="text-sm text-slate-700">From</span>
                    <input
                        type="date"
                        className="rounded-xl border border-slate-200 px-3 py-2"
                        value={from ?? ""}
                        onChange={(e) => wizard.dispatch({
                            type: "SET_RANGE",
                            range: {...wizard.draft.range, from: e.target.value || null}
                        })}
                    />
                </label>

                <label className="grid gap-1">
                    <span className="text-sm text-slate-700">To</span>
                    <input
                        type="date"
                        className="rounded-xl border border-slate-200 px-3 py-2"
                        value={to ?? ""}
                        onChange={(e) => wizard.dispatch({
                            type: "SET_RANGE",
                            range: {...wizard.draft.range, to: e.target.value || null}
                        })}
                    />
                </label>
            </div>

            <div className="mt-6 flex justify-between">
                <button className="rounded-xl border border-slate-200 px-4 py-2" onClick={wizard.back}>
                    Back
                </button>
                <button
                    className="rounded-xl bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
                    disabled={!from || !to}
                    onClick={wizard.next}
                >
                    Continue
                </button>
            </div>
        </div>
    );
}