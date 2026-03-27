import { useEffect, useState } from "react";
import type { JobStatus } from "../api/jobs.types";

type Props = {
    searchValue: string;
    statusValue: JobStatus | "ALL";
    onSearchChange: (value: string) => void;
    onStatusChange: (value: JobStatus | "ALL") => void;
    onCreateClick: () => void;
};

const STATUS_OPTIONS: Array<JobStatus | "ALL"> = [
    "ALL",
    "PENDING_CONFIRMATION",
    "SCHEDULED",
    "IN_PROGRESS",
    "DONE",
    "CANCELED",
    "NO_SHOW",
];

function formatStatusLabel(status: JobStatus | "ALL") {
    if (status === "ALL") return "All statuses";
    return status
        .toLowerCase()
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

export function JobsToolbar({
    searchValue,
    statusValue,
    onSearchChange,
    onStatusChange,
    onCreateClick,
}: Props) {
    const [draft, setDraft] = useState(searchValue);

    useEffect(() => {
        setDraft(searchValue);
    }, [searchValue]);

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            onSearchChange(draft);
        }, 250);

        return () => window.clearTimeout(timeout);
    }, [draft, onSearchChange]);

    return (
        <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                    type="button"
                    onClick={onCreateClick}
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                    New Job
                </button>

                <select
                    value={statusValue}
                    onChange={(event) => onStatusChange(event.target.value as JobStatus | "ALL")}
                    className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                >
                    {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                            {formatStatusLabel(status)}
                        </option>
                    ))}
                </select>
            </div>

            <div className="w-full lg:max-w-md">
                <input
                    type="text"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Search by client, service, worker, or address"
                    className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                />
            </div>
        </div>
    );
}
