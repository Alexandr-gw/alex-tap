import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useMe } from "@/features/me/hooks/useMe";
import { getWorkers } from "@/features/schedule/api/schedule.api";
import { servicesApi } from "@/features/services/api/services.api";
import type { ServiceDto } from "@/features/services/api/services.types";
import { JobClientPicker } from "./JobClientPicker";
import { JobScheduleSection } from "./JobScheduleSection";
import { buildCreateJobDefaults } from "../utils/create-job-form";
import { useCreateJob } from "../hooks/create-job.queries";
import { useJobClients } from "../hooks/job-clients.queries";
import type { CreateJobInput } from "../api/create-job.types";
import type { JobClientOption } from "../api/job-clients.types";

type CreateJobFormState = ReturnType<typeof buildCreateJobDefaults>;
type LineItemForm = CreateJobFormState["lineItems"][number];

function combineDateAndTime(date: string, time: string) {
    return `${date}T${time}:00`;
}

function buildClientAddress(state: CreateJobFormState["newClient"]) {
    const cityLine = [state.city.trim(), state.province.trim(), state.postalCode.trim()]
        .filter(Boolean)
        .join(", ");

    return [
        state.addressLine1.trim(),
        state.addressLine2.trim(),
        cityLine,
        state.country.trim(),
    ]
        .filter(Boolean)
        .join(", ");
}

function toCents(value: string) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return null;
    return Math.round(parsed * 100);
}

function formatCents(cents: number) {
    return (cents / 100).toFixed(2);
}

function buildPayload(state: CreateJobFormState, companyId: string): CreateJobInput {
    const payload: CreateJobInput = {
        companyId,
        title: state.title.trim(),
        description: state.description.trim() || undefined,
        workerId: state.firstVisit.workerIds[0] ?? null,
        workerIds: state.firstVisit.workerIds,
        start: combineDateAndTime(state.firstVisit.date, state.firstVisit.startTime),
        end: combineDateAndTime(state.firstVisit.date, state.firstVisit.endTime),
        lineItems: state.lineItems.map((item) => ({
            name: item.name.trim(),
            quantity: item.quantity,
            unitPriceCents: toCents(item.unitPrice) ?? 0,
        })),
    };

    if (state.clientMode === "existing") {
        payload.clientId = state.existingClientId.trim();
    } else {
        payload.client = {
            name: state.newClient.name.trim(),
            email: state.newClient.email.trim() || undefined,
            phone: state.newClient.phone.trim() || undefined,
            address: buildClientAddress(state.newClient) || undefined,
        };
    }

    return payload;
}

function isLineItemValid(item: LineItemForm) {
    return item.name.trim().length > 0 && item.quantity >= 1 && toCents(item.unitPrice) !== null;
}

function getMinutes(time: string) {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
}

export function CreateJobForm() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { data: me } = useMe();
    const createJobMutation = useCreateJob();

    const initialState = useMemo(() => buildCreateJobDefaults(searchParams), [searchParams]);
    const [form, setForm] = useState(initialState);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [activeLineItemIndex, setActiveLineItemIndex] = useState<number | null>(null);
    const [knownNoMatchTerms, setKnownNoMatchTerms] = useState<string[]>([]);

    const workersQuery = useQuery({
        queryKey: ["workers"],
        queryFn: getWorkers,
        staleTime: 30_000,
    });

    const clientsQuery = useJobClients(form.existingClientSearch, true);
    const activeLineItemSearch = activeLineItemIndex === null ? "" : form.lineItems[activeLineItemIndex]?.name ?? "";
    const normalizedActiveLineItemSearch = activeLineItemSearch.trim().toLowerCase();
    const knownNoMatchPrefix = useMemo(
        () =>
            knownNoMatchTerms.find(
                (term) =>
                    normalizedActiveLineItemSearch.length >= term.length &&
                    normalizedActiveLineItemSearch.startsWith(term),
            ) ?? null,
        [knownNoMatchTerms, normalizedActiveLineItemSearch],
    );
    const shouldSkipServiceSearch =
        normalizedActiveLineItemSearch.length > 0 && knownNoMatchPrefix !== null;

    const servicesQuery = useQuery({
        queryKey: ["job-service-search", activeLineItemSearch.trim()],
        queryFn: () => servicesApi.list({ search: activeLineItemSearch.trim(), pageSize: 3, active: true }),
        enabled:
            activeLineItemIndex !== null &&
            activeLineItemSearch.trim().length > 0 &&
            !shouldSkipServiceSearch,
        staleTime: 30_000,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
    });

    useEffect(() => {
        if (
            normalizedActiveLineItemSearch.length === 0 ||
            !servicesQuery.data ||
            servicesQuery.data.items.length > 0
        ) {
            return;
        }

        setKnownNoMatchTerms((prev) =>
            prev.some((term) => normalizedActiveLineItemSearch.startsWith(term))
                ? prev
                : [
                    ...prev.filter((term) => !term.startsWith(normalizedActiveLineItemSearch)),
                    normalizedActiveLineItemSearch,
                ],
        );
    }, [normalizedActiveLineItemSearch, servicesQuery.data]);

    const isValid =
        Boolean(me?.activeCompanyId) &&
        form.title.trim().length > 0 &&
        form.firstVisit.date.trim().length > 0 &&
        form.firstVisit.startTime.trim().length > 0 &&
        form.firstVisit.endTime.trim().length > 0 &&
        getMinutes(form.firstVisit.endTime) > getMinutes(form.firstVisit.startTime) &&
        form.lineItems.length > 0 &&
        form.lineItems.every(isLineItemValid) &&
        (form.clientMode === "existing"
            ? form.existingClientId.trim().length > 0
            : form.newClient.name.trim().length > 0);

    function updateFirstVisit(
        patch: Partial<{
            date: string;
            startTime: string;
            endTime: string;
            workerIds: string[];
        }>,
    ) {
        setForm((prev) => ({
            ...prev,
            firstVisit: {
                ...prev.firstVisit,
                ...patch,
            },
        }));
    }

    function updateLineItem(index: number, patch: Partial<LineItemForm>) {
        setForm((prev) => ({
            ...prev,
            lineItems: prev.lineItems.map((item, itemIndex) =>
                itemIndex === index
                    ? {
                        ...item,
                        ...patch,
                    }
                    : item,
            ),
        }));
    }

    function addLineItem() {
        setForm((prev) => ({
            ...prev,
            lineItems: [
                ...prev.lineItems,
                {
                    name: "",
                    quantity: 1,
                    unitPrice: "0.00",
                },
            ],
        }));
    }

    function removeLineItem(index: number) {
        setForm((prev) => ({
            ...prev,
            lineItems: prev.lineItems.filter((_, itemIndex) => itemIndex !== index),
        }));
        setActiveLineItemIndex((current) => {
            if (current === null) return current;
            if (current === index) return null;
            if (current > index) return current - 1;
            return current;
        });
    }

    function handleCustomerSearchChange(value: string) {
        setForm((prev) => ({
            ...prev,
            clientMode: "existing",
            existingClientId: "",
            existingClientSearch: value,
        }));
    }

    function handleSelectExistingClient(client: JobClientOption) {
        setForm((prev) => ({
            ...prev,
            clientMode: "existing",
            existingClientId: client.id,
            existingClientSearch: client.name,
        }));
    }

    function handleSaveNewClient() {
        if (!form.newClient.name.trim()) {
            setSubmitError("Customer name is required.");
            return false;
        }

        setSubmitError(null);
        setForm((prev) => ({
            ...prev,
            clientMode: "new",
            existingClientId: "",
            existingClientSearch: "",
        }));
        return true;
    }

    function handleSelectService(index: number, service: ServiceDto) {
        updateLineItem(index, {
            name: service.name,
            unitPrice: formatCents(service.basePriceCents),
        });
        setActiveLineItemIndex(null);
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSubmitError(null);

        if (!me?.activeCompanyId) {
            setSubmitError("Active company is required before creating a job.");
            return;
        }

        if (getMinutes(form.firstVisit.endTime) <= getMinutes(form.firstVisit.startTime)) {
            setSubmitError("End time must be after start time.");
            return;
        }

        if (!form.lineItems.every(isLineItemValid)) {
            setSubmitError("Each line item needs a name, quantity, and valid unit price.");
            return;
        }

        if (form.clientMode === "existing" && !form.existingClientId.trim()) {
            setSubmitError("Please select a customer or create a new one.");
            return;
        }

        if (form.clientMode === "new" && !form.newClient.name.trim()) {
            setSubmitError("Customer name is required.");
            return;
        }

        try {
            const payload = buildPayload(form, me.activeCompanyId);
            const created = await createJobMutation.mutateAsync(payload);
            navigate(`/app/jobs/${created.id}`);
        } catch (error) {
            setSubmitError(error instanceof Error ? error.message : "Failed to create job.");
        }
    }

    return (
        <form onSubmit={onSubmit} className="space-y-6">
            <JobClientPicker
                clientMode={form.clientMode}
                existingClientSearch={form.existingClientSearch}
                existingClients={clientsQuery.data?.items ?? []}
                existingClientsLoading={clientsQuery.isLoading}
                existingClientsError={clientsQuery.isError}
                newClient={form.newClient}
                onSearchChange={handleCustomerSearchChange}
                onSelectExistingClient={handleSelectExistingClient}
                onNewClientChange={(patch) =>
                    setForm((prev) => ({
                        ...prev,
                        newClient: {
                            ...prev.newClient,
                            ...patch,
                        },
                    }))
                }
                onSaveNewClient={handleSaveNewClient}
            />

            <section className="rounded-3xl border border-slate-200 bg-white p-6">
                <div>
                    <h2 className="text-xl font-semibold text-slate-900">Job info</h2>
                </div>

                <div className="mt-5 grid gap-4">
                    <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">Subject</span>
                        <input
                            value={form.title}
                            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                            placeholder="Job title"
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                        />
                    </label>

                    <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">Description / instructions</span>
                        <textarea
                            rows={5}
                            value={form.description}
                            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                            placeholder="Add internal instructions or customer-facing notes"
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                        />
                    </label>
                </div>
            </section>

            <JobScheduleSection
                date={form.firstVisit.date}
                startTime={form.firstVisit.startTime}
                endTime={form.firstVisit.endTime}
                workerIds={form.firstVisit.workerIds}
                workers={workersQuery.data ?? []}
                workersLoading={workersQuery.isLoading}
                onChange={updateFirstVisit}
            />

            <section className="rounded-3xl border border-slate-200 bg-white p-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-semibold text-slate-900">Line items</h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Start typing to search services, or keep typing a custom item manually.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={addLineItem}
                        className="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                        Add line item
                    </button>
                </div>

                <div className="mt-5 space-y-4">
                    {form.lineItems.map((item, index) => {
                        const showSuggestions = activeLineItemIndex === index && item.name.trim().length > 0;
                        const suggestions = showSuggestions ? servicesQuery.data?.items ?? [] : [];

                        return (
                            <div
                                key={index}
                                className="grid gap-4 rounded-2xl border border-slate-200 p-4 md:grid-cols-[minmax(0,1fr)_120px_160px_auto] md:items-end"
                            >
                                <label className="relative block">
                                    <span className="mb-1 block text-sm font-medium text-slate-700">Item name</span>
                                    <input
                                        value={item.name}
                                        onFocus={() => setActiveLineItemIndex(index)}
                                        onBlur={() => window.setTimeout(() => setActiveLineItemIndex((current) => (current === index ? null : current)), 120)}
                                        onChange={(e) => {
                                            updateLineItem(index, { name: e.target.value });
                                            setActiveLineItemIndex(index);
                                        }}
                                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                                    />

                                    {showSuggestions ? (
                                        <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                                            {servicesQuery.isLoading ? (
                                                <div className="px-4 py-3 text-sm text-slate-500">Searching services...</div>
                                            ) : suggestions.length ? (
                                                <div className="divide-y divide-slate-200">
                                                    {suggestions.map((service) => (
                                                        <button
                                                            key={service.id}
                                                            type="button"
                                                            onMouseDown={(event) => event.preventDefault()}
                                                            onClick={() => handleSelectService(index, service)}
                                                            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
                                                        >
                                                            <span className="font-medium text-slate-900">{service.name}</span>
                                                            <span className="text-sm text-slate-500">${formatCents(service.basePriceCents)}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="px-4 py-3 text-sm text-slate-500">
                                                    No service match. Keep typing to use a custom line item.
                                                </div>
                                            )}
                                        </div>
                                    ) : null}
                                </label>

                                <label className="block">
                                    <span className="mb-1 block text-sm font-medium text-slate-700">Qty</span>
                                    <input
                                        type="number"
                                        min={1}
                                        value={item.quantity}
                                        onChange={(e) =>
                                            updateLineItem(index, {
                                                quantity: Math.max(1, Number(e.target.value) || 1),
                                            })
                                        }
                                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                                    />
                                </label>

                                <label className="block">
                                    <span className="mb-1 block text-sm font-medium text-slate-700">Unit price</span>
                                    <input
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        value={item.unitPrice}
                                        onChange={(e) => updateLineItem(index, { unitPrice: e.target.value })}
                                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                                    />
                                </label>

                                <button
                                    type="button"
                                    onClick={() => removeLineItem(index)}
                                    disabled={form.lineItems.length === 1}
                                    className="rounded-2xl border border-slate-300 px-4 py-3 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                >
                                    Remove
                                </button>
                            </div>
                        );
                    })}
                </div>
            </section>

            {submitError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {submitError}
                </div>
            ) : null}

            <section className="flex items-center justify-end gap-3 rounded-3xl border border-slate-200 bg-white p-4">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="rounded-2xl border border-slate-300 px-4 py-3 font-medium text-slate-700 hover:bg-slate-50"
                >
                    Cancel
                </button>

                <button
                    type="submit"
                    disabled={!isValid || createJobMutation.isPending}
                    className="rounded-2xl bg-emerald-600 px-5 py-3 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                    {createJobMutation.isPending ? "Creating..." : "Create job"}
                </button>
            </section>
        </form>
    );
}


