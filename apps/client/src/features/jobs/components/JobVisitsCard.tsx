import type { JobDetailsDto } from "../api/jobs.types";

type Props = {
    job: JobDetailsDto;
};

function formatDateTime(value: string) {
    return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(new Date(value));
}

export function JobVisitsCard({ job }: Props) {
    return (
        <section className="rounded-3xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                <h2 className="text-2xl font-semibold text-slate-900">Visits</h2>
                <button
                    type="button"
                    className="rounded-2xl border border-slate-300 px-4 py-2.5 font-medium text-emerald-700 hover:bg-emerald-50"
                >
                    New visit
                </button>
            </div>

            <div className="divide-y divide-slate-200">
                {job.visits.map((visit) => (
                    <div
                        key={visit.id}
                        className="flex flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between"
                    >
                        <div>
                            <p className="font-medium text-slate-900">
                                {formatDateTime(visit.start)}
                            </p>
                            <p className="text-sm text-slate-600">
                                Assigned to{" "}
                                {visit.assignedWorkers.length
                                    ? visit.assignedWorkers.map((w) => w.name).join(", ")
                                    : "Unassigned"}
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                                {visit.status}
                            </span>
                            {visit.completed && (
                                <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700">
                                    Completed
                                </span>
                            )}
                        </div>
                    </div>
                ))}

                {!job.visits.length && (
                    <div className="px-6 py-10 text-center text-slate-500">
                        No visits scheduled yet
                    </div>
                )}
            </div>
        </section>
    );
}
