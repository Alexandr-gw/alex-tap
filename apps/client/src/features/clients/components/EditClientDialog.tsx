import { useEffect, useState } from "react";
import type { ClientDetailsDto, CreateClientInput, UpdateClientInput } from "../api/clients.types";

type Props = {
    open: boolean;
    client: ClientDetailsDto | null;
    mode?: "create" | "edit";
    isSaving?: boolean;
    isDeleting?: boolean;
    onClose: () => void;
    onSubmit: (input: CreateClientInput | UpdateClientInput) => Promise<void> | void;
    onDelete?: () => Promise<void> | void;
};

type ClientFormState = {
    name: string;
    phone: string;
    email: string;
    address: string;
    internalNotes: string;
};

const EMPTY_FORM: ClientFormState = {
    name: "",
    phone: "",
    email: "",
    address: "",
    internalNotes: "",
};

export function EditClientDialog({
    open,
    client,
    mode = "edit",
    isSaving = false,
    isDeleting = false,
    onClose,
    onSubmit,
    onDelete,
}: Props) {
    const [form, setForm] = useState<ClientFormState>(EMPTY_FORM);

    useEffect(() => {
        if (mode === "create") {
            setForm(EMPTY_FORM);
            return;
        }

        if (!client) return;

        setForm({
            name: client.name ?? "",
            phone: client.phone ?? "",
            email: client.email ?? "",
            address: client.address ?? "",
            internalNotes: client.internalNotes ?? "",
        });
    }, [client, mode, open]);

    if (!open || (mode === "edit" && !client)) return null;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        await onSubmit({
            name: form.name.trim(),
            phone: form.phone.trim(),
            email: form.email.trim(),
            address: form.address.trim(),
            internalNotes: form.internalNotes.trim(),
        });
    }

    const title = mode === "create" ? "New client" : "Edit client";
    const subtitle = mode === "create"
        ? "Create a new customer record."
        : "Update customer information and internal notes.";
    const actionLabel = mode === "create" ? "Create client" : "Save changes";

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-[2px]">
            <div className="flex min-h-full items-start justify-center py-4 sm:items-center">
                <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f9fcff_100%)] shadow-[0_28px_80px_rgba(15,23,42,0.22)]">
                    <div className="flex items-center justify-between border-b border-emerald-100 bg-[linear-gradient(135deg,#eefbf4_0%,#eef7ff_100%)] px-6 py-5">
                        <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
                                Clients
                            </div>
                            <h2 className="mt-2 text-xl font-semibold text-slate-900">{title}</h2>
                            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-sky-100 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:border-emerald-200 hover:bg-sky-50"
                        >
                            Close
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-6">
                            <div className="grid gap-4 sm:grid-cols-2">
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
                                    label="Email"
                                    value={form.email}
                                    onChange={(value) => setForm((prev) => ({ ...prev, email: value }))}
                                />
                                <Field
                                    label="Address"
                                    value={form.address}
                                    onChange={(value) => setForm((prev) => ({ ...prev, address: value }))}
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-slate-700">Internal notes</label>
                                <textarea
                                    value={form.internalNotes}
                                    onChange={(e) => setForm((prev) => ({ ...prev, internalNotes: e.target.value }))}
                                    rows={5}
                                    className="mt-2 w-full rounded-2xl border border-sky-100 bg-white p-3 text-sm outline-none focus:border-emerald-300"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-emerald-100 px-6 py-5">
                            <div>
                                {mode === "edit" && onDelete ? (
                                    <button
                                        type="button"
                                        onClick={onDelete}
                                        disabled={isSaving || isDeleting}
                                        className="rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {isDeleting ? "Deleting..." : "Delete client"}
                                    </button>
                                ) : null}
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="rounded-xl border border-sky-100 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-emerald-200 hover:bg-sky-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving || isDeleting || !form.name.trim()}
                                    className="rounded-xl border border-emerald-300 bg-[linear-gradient(135deg,#41be7f_0%,#5ea9f0_100%)] px-4 py-2 text-sm font-medium text-white hover:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isSaving ? "Saving..." : actionLabel}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

type FieldProps = {
    label: string;
    value: string;
    onChange: (value: string) => void;
    required?: boolean;
};

function Field({ label, value, onChange, required = false }: FieldProps) {
    return (
        <div>
            <label className="text-sm font-medium text-slate-700">
                {label}
                {required ? " *" : ""}
            </label>
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-sky-100 bg-white px-3 text-sm outline-none focus:border-emerald-300"
            />
        </div>
    );
}
