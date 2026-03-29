import { Link } from "react-router-dom";
import type { ClientJobDto } from "../api/clients.types";
import { formatDateTime, formatMoney } from "./formatters";

type Props = {
    jobs: ClientJobDto[];
};

export function ClientJobsSection({ jobs }: Props) {
    return (
        <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Jobs</h2>
                <p className="text-sm text-slate-500">All jobs linked to this client.</p>
            </div>

            {jobs.length === 0 ? (
                <EmptyState text="No jobs yet." />
            ) : (
                <div className="space-y-3">
                    {jobs.map((job) => (
                        <div
                            key={job.id}
                            className="flex flex-col gap-2 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                            <div>
                                <div className="font-medium text-slate-900">
                                    {job.title || `Job #${job.id.slice(0, 8)}`}
                                </div>
                                <div className="mt-1 text-sm text-slate-500">
                                    {formatDateTime(job.start)} | {job.workerName || "Unassigned"} | {job.status}
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="text-sm font-medium text-slate-700">
                                    {formatMoney(job.totalAmountCents)}
                                </div>
                                <Link
                                    to={`/app/jobs/${job.id}`}
                                    className="text-sm font-medium text-slate-900 hover:underline"
                                >
                                    Open
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

function EmptyState({ text }: { text: string }) {
    return <div className="rounded-xl border border-dashed p-6 text-sm text-slate-500">{text}</div>;
}
