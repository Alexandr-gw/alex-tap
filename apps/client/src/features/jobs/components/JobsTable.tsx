import { Link } from "react-router-dom";
import type { JobListItemDto } from "../api/jobs.types";

type Props = {
    items: JobListItemDto[];
    isLoading?: boolean;
};

function formatDateTime(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown";

    return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(date);
}

function getStatusTone(status: JobListItemDto["status"]) {
    switch (status) {
        case "DONE":
            return "bg-emerald-50 text-emerald-700";
        case "IN_PROGRESS":
            return "bg-sky-50 text-sky-700";
        case "PENDING_CONFIRMATION":
            return "bg-amber-50 text-amber-700";
        case "CANCELED":
        case "NO_SHOW":
            return "bg-rose-50 text-rose-700";
        default:
            return "bg-slate-100 text-slate-700";
    }
}

function formatStatus(status: JobListItemDto["status"]) {
    return status
        .toLowerCase()
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

export function JobsTable({ items, isLoading = false }: Props) {
    if (isLoading) {
        return (
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Loading jobs...</div>
            </div>
        );
    }

    if (!items.length) {
        return (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
                <h2 className="text-base font-semibold text-slate-900">No jobs found</h2>
                <p className="mt-2 text-sm text-slate-500">
                    Try a different filter or create a new job.
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                    <thead className="bg-slate-50 text-left text-sm text-slate-600">
                        <tr>
                            <th className="px-5 py-3 font-medium">Job</th>
                            <th className="px-5 py-3 font-medium">Client</th>
                            <th className="px-5 py-3 font-medium">Schedule</th>
                            <th className="px-5 py-3 font-medium">Assigned</th>
                            <th className="px-5 py-3 font-medium">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((job) => (
                            <tr key={job.id} className="border-t border-slate-200 text-sm hover:bg-slate-50/80">
                                <td className="px-5 py-4 align-top">
                                    <Link
                                        to={`/app/jobs/${job.id}`}
                                        className="font-semibold text-slate-900 hover:underline"
                                    >
                                        {job.serviceName ?? "Job"}
                                    </Link>
                                    <div className="mt-1 text-xs text-slate-500">
                                        {job.location || "No service address"}
                                    </div>
                                </td>
                                <td className="px-5 py-4 align-top text-slate-700">
                                    <div className="font-medium text-slate-900">
                                        {job.clientName || "No client"}
                                    </div>
                                    <div className="mt-1 text-xs text-slate-500">
                                        {job.clientEmail || "No email"}
                                    </div>
                                </td>
                                <td className="px-5 py-4 align-top text-slate-700">
                                    <div>{formatDateTime(job.startAt)}</div>
                                    <div className="mt-1 text-xs text-slate-500">
                                        Ends {formatDateTime(job.endAt)}
                                    </div>
                                </td>
                                <td className="px-5 py-4 align-top text-slate-700">
                                    {job.workerName || (job.workerIds.length ? `${job.workerIds.length} workers` : "Unassigned")}
                                </td>
                                <td className="px-5 py-4 align-top">
                                    <span
                                        className={[
                                            "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                                            getStatusTone(job.status),
                                        ].join(" ")}
                                    >
                                        {formatStatus(job.status)}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
