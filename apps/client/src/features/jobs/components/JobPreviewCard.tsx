import { Link } from "react-router-dom";
import type { JobDetailsDto } from "../api/jobs.types";

type Props = {
    job: JobDetailsDto;
    onEdit: () => void;
    onClose?: () => void;
};

function formatDateTime(value?: string | null) {
    if (!value) return "—";
    return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(new Date(value));
}

function formatAddress(job: JobDetailsDto) {
    const c = job.client;
    if (!c) return "—";

    return [
        c.addressLine1,
        c.addressLine2,
        [c.city, c.province].filter(Boolean).join(", "),
        c.postalCode,
    ]
        .filter(Boolean)
        .join(" ");
}

export function JobPreviewCard({ job, onEdit, onClose }: Props) {
    const firstVisit = job.visits[0];

    return (
        <div className="w-[360px] rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-200 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Job #{job.jobNumber}
                        </p>
                        <h3 className="mt-1 text-lg font-semibold text-slate-900">
                            {job.title}
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                            {job.client?.name ?? "No client"}
                        </p>
                    </div>

                    <span
                        className={[
                            "rounded-full px-2.5 py-1 text-xs font-medium",
                            job.completed
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-700",
                        ].join(" ")}
                    >
                        {job.completed ? "Completed" : job.status}
                    </span>
                </div>
            </div>

            <div className="space-y-4 px-4 py-4 text-sm">
                <div>
                    <p className="font-medium text-slate-900">Details</p>
                    <p className="mt-1 text-slate-600">
                        {job.description?.trim() || "No description"}
                    </p>
                </div>

                <div>
                    <p className="font-medium text-slate-900">Visit</p>
                    <p className="mt-1 text-slate-600">
                        {firstVisit ? formatDateTime(firstVisit.start) : "No visit scheduled"}
                    </p>
                </div>

                <div>
                    <p className="font-medium text-slate-900">Team</p>
                    <p className="mt-1 text-slate-600">
                        {job.workers.length
                            ? job.workers.map((w) => w.name).join(", ")
                            : "Unassigned"}
                    </p>
                </div>

                <div>
                    <p className="font-medium text-slate-900">Location</p>
                    <p className="mt-1 text-slate-600">{formatAddress(job)}</p>
                </div>

                <div>
                    <p className="font-medium text-slate-900">Line items</p>
                    <p className="mt-1 text-slate-600">
                        {job.lineItems.length
                            ? `${job.lineItems.length} item(s)`
                            : "No line items listed"}
                    </p>
                </div>
            </div>

            <div className="flex gap-3 border-t border-slate-200 p-4">
                <button
                    type="button"
                    onClick={onEdit}
                    className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 font-medium text-slate-800 hover:bg-slate-50"
                >
                    Edit
                </button>

                <Link
                    to={`/jobs/${job.id}`}
                    onClick={onClose}
                    className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-center font-medium text-white hover:bg-emerald-700"
                >
                    View details
                </Link>
            </div>
        </div>
    );
}
