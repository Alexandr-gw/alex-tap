import { useEffect, useState } from "react";
import type { JobDetailsDto } from "../api/jobs.types";
import { useUpdateInternalNotes } from "../hooks/jobs.queries";

type Props = {
    job: JobDetailsDto;
};

export function JobInternalNotesCard({ job }: Props) {
    const [value, setValue] = useState(job.internalNotes ?? "");
    const mutation = useUpdateInternalNotes(job.id);

    useEffect(() => {
        setValue(job.internalNotes ?? "");
    }, [job.internalNotes]);

    async function onSave() {
        await mutation.mutateAsync({ internalNotes: value });
    }

    return (
        <section className="rounded-3xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="text-2xl font-semibold text-slate-900">Internal notes</h2>
                <p className="mt-1 text-sm text-slate-500">
                    Internal notes will only be seen by your team
                </p>
            </div>

            <div className="space-y-4 px-6 py-5">
                <textarea
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    rows={6}
                    placeholder="Note details"
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                />

                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-slate-500">
                    File upload comes next pass
                </div>

                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={onSave}
                        disabled={mutation.isPending}
                        className="rounded-2xl bg-emerald-600 px-4 py-3 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                        {mutation.isPending ? "Saving..." : "Save notes"}
                    </button>
                </div>
            </div>
        </section>
    );
}
