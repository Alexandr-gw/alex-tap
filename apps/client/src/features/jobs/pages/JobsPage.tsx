import { useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { JobsOverviewCards } from "../components/JobsOverviewCards";
import { JobsTable } from "../components/JobsTable";
import { JobsToolbar } from "../components/JobsToolbar";
import { useJobs } from "../hooks/jobs.queries";
import type { JobListItemDto, JobStatus } from "../api/jobs.types";

function matchesSearch(job: JobListItemDto, search: string) {
    if (!search.trim()) return true;

    const haystack = [
        job.serviceName,
        job.clientName,
        job.workerName,
        job.clientEmail,
        job.location,
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

    return haystack.includes(search.trim().toLowerCase());
}

function sortJobs(items: JobListItemDto[]) {
    return [...items].sort(
        (left, right) => Date.parse(right.startAt) - Date.parse(left.startAt),
    );
}

export function JobsPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const search = searchParams.get("search") ?? "";
    const status = (searchParams.get("status") as JobStatus | "ALL" | null) ?? "ALL";
    const jobsQuery = useJobs({ take: 120 });

    const jobs = jobsQuery.data?.items ?? [];
    const filteredJobs = useMemo(() => {
        return sortJobs(jobs).filter((job) => {
            const matchesStatus = status === "ALL" ? true : job.status === status;
            return matchesStatus && matchesSearch(job, search);
        });
    }, [jobs, search, status]);

    const spotlightJob = filteredJobs[0] ?? null;

    function updateParams(next: Partial<{ search: string; status: JobStatus | "ALL" }>) {
        const updated = new URLSearchParams(searchParams);

        if (typeof next.search === "string") {
            if (next.search.trim()) updated.set("search", next.search.trim());
            else updated.delete("search");
        }

        if (next.status) {
            if (next.status === "ALL") updated.delete("status");
            else updated.set("status", next.status);
        }

        setSearchParams(updated);
    }

    return (
        <div className="space-y-6">
            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                    <div className="max-w-2xl">
                        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                            Jobs
                        </div>
                        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                            Keep every scheduled visit, open review, and completed job in one workspace.
                        </h1>
                        <p className="mt-3 text-sm leading-6 text-slate-600">
                            This page mirrors the structure of the client workspace, but the main subject is the job itself.
                            Start from the latest work, then drill into the individual job record when you need the full detail view.
                        </p>
                    </div>

                    {spotlightJob ? (
                        <Link
                            to={`/app/jobs/${spotlightJob.id}`}
                            className="block rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md xl:max-w-sm"
                        >
                            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                                Job spotlight
                            </div>
                            <div className="mt-3 text-xl font-semibold text-slate-950">
                                {spotlightJob.serviceName ?? "Job"}
                            </div>
                            <div className="mt-2 text-sm text-slate-600">
                                {spotlightJob.clientName || "No client"}{spotlightJob.location ? ` • ${spotlightJob.location}` : ""}
                            </div>
                            <div className="mt-4 inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                                Open job
                            </div>
                        </Link>
                    ) : null}
                </div>
            </section>

            <JobsOverviewCards items={jobs} />

            <JobsToolbar
                searchValue={search}
                statusValue={status}
                onSearchChange={(value) => updateParams({ search: value })}
                onStatusChange={(value) => updateParams({ status: value })}
                onCreateClick={() => navigate("/app/jobs/new")}
            />

            {jobsQuery.isError ? (
                <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 shadow-sm">
                    Failed to load jobs.
                </div>
            ) : (
                <JobsTable items={filteredJobs} isLoading={jobsQuery.isLoading} />
            )}
        </div>
    );
}
