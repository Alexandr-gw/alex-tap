import type { ClientTaskDto } from "../api/clients.types";
import { formatDateTime } from "./formatters";

type Props = {
    tasks: ClientTaskDto[];
};

export function ClientTasksSection({ tasks }: Props) {
    return (
        <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Tasks</h2>
                <p className="text-sm text-slate-500">Tasks connected to this client.</p>
            </div>

            {tasks.length === 0 ? (
                <EmptyState text="No tasks yet." />
            ) : (
                <div className="space-y-3">
                    {tasks.map((task) => (
                        <div
                            key={task.id}
                            className="rounded-xl border p-4"
                        >
                            <div className="font-medium text-slate-900">{task.subject}</div>
                            <div className="mt-1 text-sm text-slate-500">
                                {task.completed ? "Completed" : "Open"} | {task.assignedWorkerName || "Unassigned"} | {formatDateTime(task.dueAt)}
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
