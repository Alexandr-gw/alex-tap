import { useEffect, useState } from "react";
import type { ClientDetailsDto, CreateClientInput, UpdateClientInput } from "../api/clients.types";

type Props = {
    open: boolean;
    client: ClientDetailsDto | null;
    mode?: "create" | "edit";
    isSaving?: boolean;
    onClose: () => void;
    onSubmit: (input: CreateClientInput | UpdateClientInput) => Promise<void> | void;
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
    onClose,
    onSubmit,
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
                <div className="flex items-center justify-between border-b px-5 py-4">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
                        <p className="text-sm text-slate-500">{subtitle}</p>
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
                            className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-slate-500"
                        />
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
                            {isSaving ? "Saving..." : actionLabel}
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
                className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
            />
        </div>
    );
}
