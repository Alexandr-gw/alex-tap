import { useEffect, useState } from "react";
import { isApiError } from "@/lib/api/apiError";
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
    role: "MANAGER" | "WORKER";
};

const DEFAULT_FORM: WorkerFormState = {
    name: "",
    phone: "",
    colorTag: "",
    active: true,
    role: "WORKER",
};

export function WorkerFormDialog({ open, mode, worker, isSaving = false, onClose, onSubmit }: Props) {
    const [form, setForm] = useState<WorkerFormState>(DEFAULT_FORM);
    const [submitError, setSubmitError] = useState<string | null>(null);

    useEffect(() => {
        if (mode === "edit" && worker) {
            setForm({
                name: worker.name ?? "",
                phone: worker.phone ?? "",
                colorTag: worker.colorTag ?? "",
                active: Boolean(worker.active),
                role: worker.role === "MANAGER" ? "MANAGER" : "WORKER",
            });
            setSubmitError(null);
            return;
        }

        setForm(DEFAULT_FORM);
        setSubmitError(null);
    }, [mode, worker, open]);

    if (!open) return null;

    const canEditRole = mode === "edit" && Boolean(worker?.linkedUserEmail) && worker?.role !== "ADMIN";

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        try {
            setSubmitError(null);
            await onSubmit({
                name: form.name.trim(),
                phone: form.phone.trim(),
                colorTag: form.colorTag.trim(),
                active: form.active,
                role: canEditRole ? form.role : undefined,
            });
        } catch (error) {
            setSubmitError(isApiError(error) ? error.message : "Could not save worker changes.");
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]">
            <div className="w-full max-w-xl overflow-hidden rounded-[2rem] border border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f9fcff_100%)] shadow-[0_28px_80px_rgba(15,23,42,0.22)]">
                <div className="flex items-center justify-between border-b border-emerald-100 bg-[linear-gradient(135deg,#eefbf4_0%,#eef7ff_100%)] px-6 py-5">
                    <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
                            Workers
                        </div>
                        <h2 className="mt-2 text-xl font-semibold text-slate-900">
                            {mode === "create" ? "Add worker" : "Edit worker"}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            {mode === "create"
                                ? "Create an internal worker profile for scheduling and jobs."
                                : "Update worker profile details and linked account access."}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-sky-100 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:border-emerald-200 hover:bg-sky-50"
                    >
                        Close
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 p-6">
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

                    {mode === "edit" ? (
                        <div className="space-y-3 rounded-2xl border border-sky-100 bg-[linear-gradient(180deg,#f8fcff_0%,#f4fbf8_100%)] p-4">
                            <div>
                                <div className="text-sm font-medium text-slate-700">Access role</div>
                            </div>

                            {worker?.linkedUserEmail ? (
                                worker.role === "ADMIN" ? (
                                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
                                        Admin accounts are protected here and must be managed outside the worker settings screen.
                                    </div>
                                ) : (
                                    <label className="block">
                                        <span className="text-sm font-medium text-slate-700">Role</span>
                                        <select
                                            value={form.role}
                                            onChange={(e) =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    role: e.target.value as "MANAGER" | "WORKER",
                                                }))
                                            }
                                            className="mt-2 h-11 w-full rounded-xl border border-sky-100 bg-white px-3 text-sm outline-none focus:border-emerald-300"
                                        >
                                            <option value="WORKER">Worker</option>
                                            <option value="MANAGER">Manager</option>
                                        </select>
                                    </label>
                                )
                            ) : (
                                <div className="rounded-xl border border-sky-100 bg-white px-3 py-3 text-sm text-slate-600">
                                    This worker does not have a linked login account yet, so there is no app role to change.
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-sky-100 bg-[linear-gradient(180deg,#f8fcff_0%,#f4fbf8_100%)] p-4 text-sm text-slate-600">
                            Linked login accounts and roles can be managed after the worker is connected to a user account.
                        </div>
                    )}

                    <div className="space-y-3 rounded-2xl border border-sky-100 bg-[linear-gradient(180deg,#f8fcff_0%,#f4fbf8_100%)] p-4">
                        <label className="flex items-center justify-between gap-4">
                            <span className="text-sm font-medium text-slate-700">Active</span>
                            <input
                                type="checkbox"
                                checked={form.active}
                                onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
                            />
                        </label>
                    </div>

                    {submitError ? (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {submitError}
                        </div>
                    ) : null}

                    <div className="flex justify-end gap-3 border-t border-emerald-100 pt-5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-sky-100 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-emerald-200 hover:bg-sky-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving || !form.name.trim()}
                            className="rounded-xl border border-emerald-300 bg-[linear-gradient(135deg,#41be7f_0%,#5ea9f0_100%)] px-4 py-2 text-sm font-medium text-white hover:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
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
                className="mt-2 h-11 w-full rounded-xl border border-sky-100 bg-white px-3 text-sm outline-none focus:border-emerald-300"
            />
        </div>
    );
}
