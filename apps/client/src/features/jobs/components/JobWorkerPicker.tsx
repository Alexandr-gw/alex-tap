import { useMemo, useState } from "react";
import type { WorkerDto } from "@/features/schedule/api/schedule.types";

type Props = {
    label?: string;
    workerIds: string[];
    workers: WorkerDto[];
    workersLoading?: boolean;
    helperText?: string;
    onChange: (workerIds: string[]) => void;
};

export function JobWorkerPicker({
    label = "Assign to",
    workerIds,
    workers,
    workersLoading = false,
    helperText,
    onChange,
}: Props) {
    const [open, setOpen] = useState(false);

    const selectedNames = useMemo(() => {
        const workerMap = new Map(workers.map((worker) => [worker.id, worker.name]));
        const names = workerIds.map((workerId) => workerMap.get(workerId) ?? workerId);
        return names.length ? names.join(", ") : "Unassigned";
    }, [workerIds, workers]);

    function toggleWorker(workerId: string, checked: boolean) {
        const nextWorkerIds = checked
            ? [workerId, ...workerIds.filter((id) => id !== workerId)]
            : workerIds.filter((id) => id !== workerId);

        onChange(nextWorkerIds);
    }

    return (
        <div className="space-y-3">
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                className="flex w-full items-center justify-between rounded-2xl border border-slate-300 px-4 py-3 text-left hover:bg-slate-50"
            >
                <div>
                    <div className="text-sm font-medium text-slate-700">{label}</div>
                    <div className="mt-1 text-sm text-slate-500">{selectedNames}</div>
                </div>
                <span className="text-sm text-slate-400">{open ? "Hide" : "Select"}</span>
            </button>

            {open ? (
                <div className="max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-2">
                    {workersLoading ? (
                        <div className="px-3 py-4 text-sm text-slate-500">Loading workers...</div>
                    ) : workers.length ? (
                        <div className="space-y-2">
                            {workers.map((worker) => {
                                const checked = workerIds.includes(worker.id);

                                return (
                                    <label
                                        key={worker.id}
                                        className={[
                                            "flex items-center gap-3 rounded-2xl border px-3 py-3 text-sm",
                                            checked
                                                ? "border-emerald-300 bg-white"
                                                : "border-transparent bg-transparent hover:border-slate-200 hover:bg-white",
                                        ].join(" ")}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={(e) => toggleWorker(worker.id, e.target.checked)}
                                            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                        />
                                        <span className="font-medium text-slate-900">{worker.name}</span>
                                    </label>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="px-3 py-4 text-sm text-slate-500">No workers available.</div>
                    )}
                </div>
            ) : null}

            {helperText ? <p className="text-sm text-slate-500">{helperText}</p> : null}
        </div>
    );
}
