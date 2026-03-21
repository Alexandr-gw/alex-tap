import { JobWorkerPicker } from "./JobWorkerPicker";
import type { WorkerDto } from "@/features/schedule/api/schedule.types";

type Props = {
    date: string;
    startTime: string;
    endTime: string;
    workerIds: string[];
    workers: WorkerDto[];
    workersLoading: boolean;
    onChange: (patch: {
        date?: string;
        startTime?: string;
        endTime?: string;
        workerIds?: string[];
    }) => void;
};

export function JobScheduleSection({
    date,
    startTime,
    endTime,
    workerIds,
    workers,
    workersLoading,
    onChange,
}: Props) {
    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-6">
            <div>
                <h2 className="text-xl font-semibold text-slate-900">Schedule</h2>
                <p className="mt-1 text-sm text-slate-500">
                    Set timing and assign everyone who should work this job.
                </p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">Date</span>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => onChange({ date: e.target.value })}
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                    />
                </label>

                <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">Start time</span>
                    <input
                        type="time"
                        value={startTime}
                        onChange={(e) => onChange({ startTime: e.target.value })}
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                    />
                </label>

                <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">End time</span>
                    <input
                        type="time"
                        value={endTime}
                        onChange={(e) => onChange({ endTime: e.target.value })}
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                    />
                </label>
            </div>

            <div className="mt-5">
                <JobWorkerPicker
                    label="Assign to"
                    workerIds={workerIds}
                    workers={workers}
                    workersLoading={workersLoading}
                    helperText="Check every worker who should be assigned to this job."
                    onChange={(nextWorkerIds) => onChange({ workerIds: nextWorkerIds })}
                />
            </div>
        </section>
    );
}
