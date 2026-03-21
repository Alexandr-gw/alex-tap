import { useEffect, useState } from "react";
import type { CreateWorkerInput, UpdateWorkerInput, WorkerListItemDto } from "../api/settings.types";

type Props = {
    open: boolean;
    mode: "create" | "edit";
    worker: WorkerListItemDto | null;
    isSaving?: boolean;
    onClose: () => void;
    onSubmit: (input: CreateWorkerInput | UpdateWorkerInput) => Promise<void> | void;
};

type WorkerFormState = {
    name: string;
    phone: string;
    colorTag: string;
    active: boolean;
};

const DEFAULT_FORM: WorkerFormState = {
    name: "",
    phone: "",
    colorTag: "",
    active: true,
};

export function WorkerFormDialog({ open, mode, worker, isSaving = false, onClose, onSubmit }: Props) {
    const [form, setForm] = useState<WorkerFormState>(DEFAULT_FORM);

    useEffect(() => {
        if (mode === "edit" && worker) {
            setForm({
                name: worker.name ?? "",
                phone: worker.phone ?? "",
                colorTag: worker.colorTag ?? "",
                active: Boolean(worker.active),
            });
            return;
        }

        setForm(DEFAULT_FORM);
    }, [mode, worker, open]);

    if (!open) return null;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        await onSubmit({
            name: form.name.trim(),
            phone: form.phone.trim(),
            colorTag: form.colorTag.trim(),
            active: form.active,
        });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
            <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl">
                <div className="flex items-center justify-between border-b px-5 py-4">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">
                            {mode === "create" ? "Add worker" : "Edit worker"}
                        </h2>
                        <p className="text-sm text-slate-500">
                            {mode === "create"
                                ? "Create an internal worker profile for scheduling and jobs."
                                : "Update worker profile details used in staff tools."}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100"
                    >
                        Close
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 p-5">
                    <Field
                        label="Name"
                        value={form.name}
                        onChange={(value) => setForm((prev) => ({ ...prev, name: value }))}
                        required
                    />

                    <Field
                        label="Phone"
                        value={form.phone}
                        onChange={(value) => setForm((prev) => ({ ...prev, phone: value }))}
                    />

                    <Field
                        label="Color tag"
                        value={form.colorTag}
                        onChange={(value) => setForm((prev) => ({ ...prev, colorTag: value }))}
                        placeholder="#0f766e"
                    />

                    <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-600">
                        Linked login accounts and roles are managed separately. This page controls the worker profile used by schedule and job assignment.
                    </div>

                    <div className="space-y-3 rounded-xl border bg-slate-50 p-4">
                        <label className="flex items-center justify-between gap-4">
                            <span className="text-sm font-medium text-slate-700">Active</span>
                            <input
                                type="checkbox"
                                checked={form.active}
                                onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
                            />
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 border-t pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border px-4 py-2 text-sm font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving || !form.name.trim()}
                            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isSaving ? "Saving..." : mode === "create" ? "Create worker" : "Save changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

type FieldProps = {
    label: string;
    value: string;
    onChange: (value: string) => void;
    required?: boolean;
    placeholder?: string;
};

function Field({ label, value, onChange, required = false, placeholder }: FieldProps) {
    return (
        <div>
            <label className="text-sm font-medium text-slate-700">
                {label}
                {required ? " *" : ""}
            </label>
            <input
                value={value}
                placeholder={placeholder}
                onChange={(e) => onChange(e.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
            />
        </div>
    );
}
