import {useState} from "react";
import {BookingClientSchema} from "../booking.schema";

export function StepClientDetails({wizard}: { wizard: any }) {
    const [error, setError] = useState<string | null>(null);

    const c = wizard.draft.client;

    function update(patch: Partial<typeof c>) {
        wizard.dispatch({type: "SET_CLIENT", client: {...c, ...patch}});
    }

    function onContinue() {
        const parsed = BookingClientSchema.safeParse(c);
        if (!parsed.success) {
            setError(parsed.error.issues[0]?.message ?? "Invalid form");
            return;
        }
        setError(null);
        wizard.next();
    }

    return (
        <div>
            <div className="grid gap-3">
                <label className="grid gap-1">
                    <span className="text-sm text-slate-700">Name</span>
                    <input className="rounded-xl border border-slate-200 px-3 py-2" value={c.name}
                           onChange={(e) => update({name: e.target.value})}/>
                </label>

                <label className="grid gap-1">
                    <span className="text-sm text-slate-700">Email</span>
                    <input className="rounded-xl border border-slate-200 px-3 py-2" value={c.email ?? ""}
                           onChange={(e) => update({email: e.target.value})}/>
                </label>

                <label className="grid gap-1">
                    <span className="text-sm text-slate-700">Phone</span>
                    <input className="rounded-xl border border-slate-200 px-3 py-2" value={c.phone ?? ""}
                           onChange={(e) => update({phone: e.target.value})}/>
                </label>

                <label className="grid gap-1">
                    <span className="text-sm text-slate-700">Notes</span>
                    <textarea className="min-h-24 rounded-xl border border-slate-200 px-3 py-2" value={c.notes ?? ""}
                              onChange={(e) => update({notes: e.target.value})}/>
                </label>

                {error ? <div className="text-sm text-red-600">{error}</div> : null}
            </div>

            <div className="mt-6 flex justify-between">
                <button className="rounded-xl border border-slate-200 px-4 py-2" onClick={wizard.back}>
                    Back
                </button>
                <button className="rounded-xl bg-slate-900 px-4 py-2 text-white" onClick={onContinue}>
                    Continue
                </button>
            </div>
        </div>
    );
}