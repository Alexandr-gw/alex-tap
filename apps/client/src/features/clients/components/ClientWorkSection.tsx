import { useState } from "react";
import { Link } from "react-router-dom";
import type { ClientJobDto, ClientTaskDto } from "../api/clients.types";
import { formatDateTime, formatMoney } from "./formatters";

type Props = {
    jobs: ClientJobDto[];
    tasks: ClientTaskDto[];
};

type WorkTab = "jobs" | "tasks";

export function ClientWorkSection({ jobs, tasks }: Props) {
    const [activeTab, setActiveTab] = useState<WorkTab>("jobs");

    return (
        <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Work history</h2>
                    <p className="text-sm text-slate-500">Jobs and tasks connected to this client.</p>
                </div>

                <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                    <TabButton
                        label={`Jobs (${jobs.length})`}
                        active={activeTab === "jobs"}
                        onClick={() => setActiveTab("jobs")}
                    />
                    <TabButton
                        label={`Tasks (${tasks.length})`}
                        active={activeTab === "tasks"}
                        onClick={() => setActiveTab("tasks")}
                    />
                </div>
            </div>

            <div className="mt-5">
                {activeTab === "jobs" ? <JobsList jobs={jobs} /> : <TasksList tasks={tasks} />}
            </div>
        </section>
    );
}

function JobsList({ jobs }: { jobs: ClientJobDto[] }) {
    if (!jobs.length) {
        return <EmptyState text="No jobs yet." />;
    }

    return (
        <div className="space-y-3">
            {jobs.map((job) => (
                <div
                    key={job.id}
                    className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
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
    );
}

function TasksList({ tasks }: { tasks: ClientTaskDto[] }) {
    if (!tasks.length) {
        return <EmptyState text="No tasks yet." />;
    }

    return (
        <div className="space-y-3">
            {tasks.map((task) => (
                <div key={task.id} className="rounded-xl border p-4">
                    <div className="font-medium text-slate-900">{task.subject}</div>
                    <div className="mt-1 text-sm text-slate-500">
                        {task.completed ? "Completed" : "Open"} | {task.assignedWorkerName || "Unassigned"} | {formatDateTime(task.dueAt)}
                    </div>
                </div>
            ))}
        </div>
    );
}

function TabButton({
    label,
    active,
    onClick,
}: {
    label: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={[
                "rounded-lg px-3 py-2 text-sm font-medium transition",
                active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900",
            ].join(" ")}
        >
            {label}
        </button>
    );
}

function EmptyState({ text }: { text: string }) {
    return <div className="rounded-xl border border-dashed p-6 text-sm text-slate-500">{text}</div>;
}
