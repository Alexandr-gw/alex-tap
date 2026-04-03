import { useEffect, useState } from "react";
import type { CompanySettingsDto, UpdateCompanySettingsInput } from "../api/settings.types";

type Props = {
    company: CompanySettingsDto | null;
    isSaving?: boolean;
    onSubmit: (input: UpdateCompanySettingsInput) => Promise<void> | void;
};

type CompanySettingsFormState = {
    name: string;
    timezone: string;
    bookingSlug: string;
};

export function CompanySettingsForm({ company, isSaving = false, onSubmit }: Props) {
    const [form, setForm] = useState<CompanySettingsFormState>({
        name: "",
        timezone: "",
        bookingSlug: "",
    });

    useEffect(() => {
        if (!company) return;

        setForm({
            name: company.name ?? "",
            timezone: company.timezone ?? "",
            bookingSlug: company.bookingSlug ?? "",
        });
    }, [company]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        await onSubmit({
            name: form.name.trim(),
            timezone: form.timezone.trim(),
            bookingSlug: form.bookingSlug.trim(),
        });
    }

    return (
        <form onSubmit={handleSubmit} className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-5">
                <h1 className="text-2xl font-semibold text-slate-900">Company settings</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Manage the company identity used across staff tools and public booking.
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <Field
                    label="Company name"
                    value={form.name}
                    onChange={(value) => setForm((prev) => ({ ...prev, name: value }))}
                    required
                />
                <Field
                    label="Timezone"
                    value={form.timezone}
                    onChange={(value) => setForm((prev) => ({ ...prev, timezone: value }))}
                    placeholder="America/Edmonton"
                    required
                />
                <div className="sm:col-span-2">
                    <Field
                        label="Public booking slug"
                        value={form.bookingSlug}
                        onChange={(value) => setForm((prev) => ({ ...prev, bookingSlug: value }))}
                        placeholder="alex-home-services"
                    />
                    <p className="mt-2 text-xs text-slate-500">
                        Used in public booking links like /book/{form.bookingSlug.trim() || "your-company"}.
                    </p>
                </div>
            </div>

            <div className="mt-6 flex justify-end border-t pt-4">
                <button
                    type="submit"
                    disabled={isSaving || !form.name.trim() || !form.timezone.trim()}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isSaving ? "Saving..." : "Save changes"}
                </button>
            </div>
        </form>
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
