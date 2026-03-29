import { useEffect, useMemo, useState } from "react";
import type { TaskDto } from "../api/tasks.types";
import {
    useCreateTask,
    useDeleteTask,
    useUpdateTask,
} from "../hooks/tasks.queries";
import { TaskFormSchema, type TaskFormValues } from "../tasks.schema";

type CustomerOption = {
    id: string;
    name: string;
    address?: string | null;
};

type WorkerOption = {
    id: string;
    name: string;
};

type Prefill = {
    date?: string;
    startTime?: string;
    endTime?: string;
    workerIds?: string[];
};

type Props = {
    open: boolean;
    mode: "create" | "edit";
    task?: TaskDto | null;
    prefill?: Prefill | null;
    customers: CustomerOption[];
    workers: WorkerOption[];
    onClose: () => void;
};

function toDateInputValue(iso: string) {
    const d = new Date(iso);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function toTimeInputValue(iso: string) {
    const d = new Date(iso);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
}

function combineLocalDateTime(date: string, time: string) {
    return new Date(`${date}T${time}:00`).toISOString();
}

export function TaskFormModal({
    open,
    mode,
    task,
    prefill,
    customers,
    workers,
    onClose,
}: Props) {
    const createMutation = useCreateTask();
    const updateMutation = useUpdateTask();
    const deleteMutation = useDeleteTask();

    const initialValues = useMemo<TaskFormValues>(() => {
        if (mode === "edit" && task) {
            return {
                subject: task.subject ?? "",
                description: task.description ?? "",
                date: toDateInputValue(task.startAt),
                startTime: toTimeInputValue(task.startAt),
                endTime: toTimeInputValue(task.endAt),
                customerId: task.customerId ?? null,
                assigneeIds: task.assigneeIds ?? [],
                completed: task.completed ?? false,
            };
        }

        const now = new Date();
        const date =
            prefill?.date ??
            `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
                now.getDate(),
            ).padStart(2, "0")}`;

        return {
            subject: "",
            description: "",
            date,
            startTime: prefill?.startTime ?? "09:00",
            endTime: prefill?.endTime ?? "10:00",
            customerId: null,
            assigneeIds: prefill?.workerIds ?? [],
            completed: false,
        };
    }, [mode, task, prefill]);

    const [values, setValues] = useState<TaskFormValues>(initialValues);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (open) {
            setValues(initialValues);
            setErrors({});
        }
    }, [open, initialValues]);

    const selectedCustomer = customers.find((c) => c.id === values.customerId);

    function setField<K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) {
        setValues((prev) => ({ ...prev, [key]: value }));
    }

    function toggleAssignee(workerId: string) {
        setValues((prev) => {
            const exists = prev.assigneeIds.includes(workerId);
            return {
                ...prev,
                assigneeIds: exists
                    ? prev.assigneeIds.filter((id) => id !== workerId)
                    : [...prev.assigneeIds, workerId],
            };
        });
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        const parsed = TaskFormSchema.safeParse(values);
        if (!parsed.success) {
            const fieldErrors: Record<string, string> = {};
            for (const issue of parsed.error.issues) {
                const key = String(issue.path[0] ?? "form");
                if (!fieldErrors[key]) fieldErrors[key] = issue.message;
            }
            setErrors(fieldErrors);
            return;
        }

        setErrors({});

        const payload = {
            subject: parsed.data.subject.trim(),
            description: parsed.data.description?.trim() || undefined,
            startAt: combineLocalDateTime(parsed.data.date, parsed.data.startTime),
            endAt: combineLocalDateTime(parsed.data.date, parsed.data.endTime),
            customerId: parsed.data.customerId || null,
            assigneeIds: parsed.data.assigneeIds,
            completed: parsed.data.completed,
        };

        try {
            if (mode === "create") {
                await createMutation.mutateAsync(payload);
            } else if (task) {
                await updateMutation.mutateAsync({
                    taskId: task.id,
                    input: payload,
                });
            }

            onClose();
        } catch {
            setErrors((prev) => ({
                ...prev,
                form: "Could not save task.",
            }));
        }
    }

    async function handleDelete() {
        if (!task) return;

        try {
            await deleteMutation.mutateAsync(task.id);
            onClose();
        } catch {
            setErrors((prev) => ({
                ...prev,
                form: "Could not delete task.",
            }));
        }
    }

    if (!open) return null;

    const isSaving = createMutation.isPending || updateMutation.isPending;
    const isDeleting = deleteMutation.isPending;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]">
            <div className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f9fcff_100%)] shadow-[0_28px_80px_rgba(15,23,42,0.22)]">
                <form onSubmit={handleSubmit} className="flex flex-col">
                    <div className="border-b border-emerald-100 bg-[linear-gradient(135deg,#eefbf4_0%,#eef7ff_100%)] px-6 py-5">
                        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
                            Tasks
                        </div>
                        <h2 className="mt-2 text-xl font-semibold text-slate-900">
                            {mode === "create" ? "Create task" : "Edit task"}
                        </h2>
                    </div>

                    <div className="space-y-5 px-6 py-5">
                        {errors.form ? (
                            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                {errors.form}
                            </div>
                        ) : null}

                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Subject
                            </label>
                            <input
                                value={values.subject}
                                onChange={(e) => setField("subject", e.target.value)}
                                className="w-full rounded-xl border border-sky-100 bg-white px-3 py-2 outline-none focus:border-emerald-300"
                                placeholder="Call customer, inspect site, send quote..."
                            />
                            {errors.subject ? (
                                <p className="mt-1 text-sm text-red-600">{errors.subject}</p>
                            ) : null}
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Description
                            </label>
                            <textarea
                                value={values.description ?? ""}
                                onChange={(e) => setField("description", e.target.value)}
                                rows={4}
                                className="w-full rounded-2xl border border-sky-100 bg-white px-3 py-2 outline-none focus:border-emerald-300"
                                placeholder="Optional notes"
                            />
                            {errors.description ? (
                                <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                            ) : null}
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">
                                    Date
                                </label>
                                <input
                                    type="date"
                                    value={values.date}
                                    onChange={(e) => setField("date", e.target.value)}
                                    className="w-full rounded-xl border border-sky-100 bg-white px-3 py-2 outline-none focus:border-emerald-300"
                                />
                                {errors.date ? (
                                    <p className="mt-1 text-sm text-red-600">{errors.date}</p>
                                ) : null}
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">
                                    Start time
                                </label>
                                <input
                                    type="time"
                                    value={values.startTime}
                                    onChange={(e) => setField("startTime", e.target.value)}
                                    className="w-full rounded-xl border border-sky-100 bg-white px-3 py-2 outline-none focus:border-emerald-300"
                                />
                                {errors.startTime ? (
                                    <p className="mt-1 text-sm text-red-600">{errors.startTime}</p>
                                ) : null}
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">
                                    End time
                                </label>
                                <input
                                    type="time"
                                    value={values.endTime}
                                    onChange={(e) => setField("endTime", e.target.value)}
                                    className="w-full rounded-xl border border-sky-100 bg-white px-3 py-2 outline-none focus:border-emerald-300"
                                />
                                {errors.endTime ? (
                                    <p className="mt-1 text-sm text-red-600">{errors.endTime}</p>
                                ) : null}
                            </div>
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Customer
                            </label>
                            <select
                                value={values.customerId ?? ""}
                                onChange={(e) =>
                                    setField("customerId", e.target.value ? e.target.value : null)
                                }
                                className="w-full rounded-xl border border-sky-100 bg-white px-3 py-2 outline-none focus:border-emerald-300"
                            >
                                <option value="">No customer</option>
                                {customers.map((customer) => (
                                    <option key={customer.id} value={customer.id}>
                                        {customer.name}
                                    </option>
                                ))}
                            </select>

                            {selectedCustomer?.address ? (
                                <div className="mt-2 rounded-xl border border-sky-100 bg-[linear-gradient(180deg,#f8fcff_0%,#f4fbf8_100%)] px-3 py-2 text-sm text-slate-600">
                                    <span className="font-medium text-slate-700">Address: </span>
                                    {selectedCustomer.address}
                                </div>
                            ) : null}
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                Assign to workers
                            </label>

                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {workers.map((worker) => {
                                    const checked = values.assigneeIds.includes(worker.id);

                                    return (
                                        <label
                                            key={worker.id}
                                            className="flex cursor-pointer items-center gap-3 rounded-xl border border-sky-100 bg-white px-3 py-2 hover:border-emerald-200 hover:bg-sky-50"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => toggleAssignee(worker.id)}
                                            />
                                            <span className="text-sm text-slate-800">
                                                {worker.name}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>

                            <p className="mt-2 text-xs text-slate-500">
                                Leave all unchecked to keep task unassigned.
                            </p>
                        </div>

                        <div className="rounded-2xl border border-sky-100 bg-[linear-gradient(180deg,#f8fcff_0%,#f4fbf8_100%)] px-3 py-3">
                            <label className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={values.completed}
                                    onChange={(e) => setField("completed", e.target.checked)}
                                />
                                <span className="text-sm font-medium text-slate-800">
                                    Completed
                                </span>
                            </label>
                        </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-emerald-100 px-6 py-4">
                        <div>
                            {mode === "edit" ? (
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                                >
                                    Delete
                                </button>
                            ) : null}
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-xl border border-sky-100 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-emerald-200 hover:bg-sky-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                disabled={isSaving}
                                className="rounded-xl border border-emerald-300 bg-[linear-gradient(135deg,#41be7f_0%,#5ea9f0_100%)] px-4 py-2 text-sm font-medium text-white hover:border-emerald-400 disabled:opacity-50"
                            >
                                {mode === "create" ? "Save task" : "Update task"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
