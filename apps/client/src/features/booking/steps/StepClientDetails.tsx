import { useMemo, useState } from "react";
import { BookingClientSchema } from "../booking.schema";

type FieldErrors = Partial<
    Record<"name" | "email" | "phone" | "addressLine1" | "addressLine2" | "notes", string>
>;

function inputClass(error?: string) {
    return [
        "rounded-xl border px-3 py-2 text-slate-900 outline-none transition",
        error
            ? "border-rose-300 bg-rose-50 focus:border-rose-400"
            : "border-slate-200 bg-white focus:border-slate-400",
    ].join(" ");
}

export function StepClientDetails({ wizard }: { wizard: any }) {
    const [errors, setErrors] = useState<FieldErrors>({});

    const client = wizard.draft.client;
    const hasErrors = useMemo(() => Object.keys(errors).length > 0, [errors]);

    function update(patch: Partial<typeof client>) {
        const nextErrors = { ...errors };
        for (const key of Object.keys(patch)) {
            delete nextErrors[key as keyof FieldErrors];
        }

        setErrors(nextErrors);
        wizard.dispatch({ type: "SET_CLIENT", client: { ...client, ...patch } });
    }

    function onContinue() {
        const parsed = BookingClientSchema.safeParse(client);
        if (!parsed.success) {
            const nextErrors: FieldErrors = {};
            for (const issue of parsed.error.issues) {
                const field = issue.path[0];
                if (typeof field === "string" && !(field in nextErrors)) {
                    nextErrors[field as keyof FieldErrors] = issue.message;
                }
            }
            setErrors(nextErrors);
            return;
        }

        setErrors({});
        wizard.next();
    }

    return (
        <div>
            <div className="mb-4">
                <div className="text-lg font-semibold text-slate-900">Your details</div>
                <p className="mt-1 text-sm text-slate-600">
                    Add the contact information we should use for this booking.
                </p>
            </div>

            <div className="grid gap-4">
                <label className="grid gap-1.5">
                    <span className="text-sm font-medium text-slate-700">Name</span>
                    <input
                        className={inputClass(errors.name)}
                        value={client.name}
                        onChange={(event) => update({ name: event.target.value })}
                    />
                    {errors.name ? <span className="text-xs text-rose-600">{errors.name}</span> : null}
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-1.5">
                        <span className="text-sm font-medium text-slate-700">Email</span>
                        <input
                            type="email"
                            className={inputClass(errors.email)}
                            value={client.email ?? ""}
                            onChange={(event) => update({ email: event.target.value })}
                        />
                        {errors.email ? <span className="text-xs text-rose-600">{errors.email}</span> : null}
                    </label>

                    <label className="grid gap-1.5">
                        <span className="text-sm font-medium text-slate-700">Phone</span>
                        <input
                            type="tel"
                            className={inputClass(errors.phone)}
                            value={client.phone ?? ""}
                            onChange={(event) => update({ phone: event.target.value })}
                        />
                        {errors.phone ? <span className="text-xs text-rose-600">{errors.phone}</span> : null}
                    </label>
                </div>

                <label className="grid gap-1.5">
                    <span className="text-sm font-medium text-slate-700">Address line 1</span>
                    <input
                        className={inputClass(errors.addressLine1)}
                        value={client.addressLine1 ?? ""}
                        onChange={(event) => update({ addressLine1: event.target.value })}
                        placeholder="Street address"
                    />
                    {errors.addressLine1 ? (
                        <span className="text-xs text-rose-600">{errors.addressLine1}</span>
                    ) : (
                        <span className="text-xs text-slate-500">
                            Optional, but helpful for the service team.
                        </span>
                    )}
                </label>

                <label className="grid gap-1.5">
                    <span className="text-sm font-medium text-slate-700">Address line 2</span>
                    <input
                        className={inputClass(errors.addressLine2)}
                        value={client.addressLine2 ?? ""}
                        onChange={(event) => update({ addressLine2: event.target.value })}
                        placeholder="Unit, suite, gate code, or extra directions"
                    />
                    {errors.addressLine2 ? <span className="text-xs text-rose-600">{errors.addressLine2}</span> : null}
                </label>

                <label className="grid gap-1.5">
                    <span className="text-sm font-medium text-slate-700">Notes</span>
                    <textarea
                        className={inputClass(errors.notes)}
                        rows={4}
                        value={client.notes ?? ""}
                        onChange={(event) => update({ notes: event.target.value })}
                        placeholder="Anything we should know before the visit?"
                    />
                    {errors.notes ? <span className="text-xs text-rose-600">{errors.notes}</span> : null}
                </label>

                {hasErrors ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                        Please fix the highlighted fields before continuing.
                    </div>
                ) : null}
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <button className="w-full rounded-xl border border-slate-200 px-4 py-2 sm:w-auto" onClick={wizard.back}>
                    Back
                </button>
                <button className="w-full rounded-xl bg-slate-900 px-4 py-2 text-white sm:w-auto" onClick={onContinue}>
                    Continue
                </button>
            </div>
        </div>
    );
}
