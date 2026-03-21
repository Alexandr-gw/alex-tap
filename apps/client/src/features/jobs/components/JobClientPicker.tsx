import { useMemo, useState } from "react";
import type { JobClientOption } from "../api/job-clients.types";

type NewClientForm = {
    name: string;
    email: string;
    phone: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
};

type Props = {
    clientMode: "existing" | "new";
    existingClientSearch: string;
    existingClients: JobClientOption[];
    existingClientsLoading: boolean;
    existingClientsError: boolean;
    newClient: NewClientForm;
    onSearchChange: (value: string) => void;
    onSelectExistingClient: (client: JobClientOption) => void;
    onNewClientChange: (patch: Partial<NewClientForm>) => void;
    onSaveNewClient: () => boolean;
};

function buildDisplayValue(clientMode: "existing" | "new", existingClientSearch: string, newClientName: string) {
    if (clientMode === "new") return newClientName;
    return existingClientSearch;
}

export function JobClientPicker({
    clientMode,
    existingClientSearch,
    existingClients,
    existingClientsLoading,
    existingClientsError,
    newClient,
    onSearchChange,
    onSelectExistingClient,
    onNewClientChange,
    onSaveNewClient,
}: Props) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [createModalOpen, setCreateModalOpen] = useState(false);

    const suggestions = useMemo(() => existingClients.slice(0, 3), [existingClients]);
    const displayValue = buildDisplayValue(clientMode, existingClientSearch, newClient.name);

    function handleCreateCustomerSave() {
        const saved = onSaveNewClient();
        if (saved) {
            setCreateModalOpen(false);
            setMenuOpen(false);
        }
    }

    return (
        <>
            <section className="rounded-3xl border border-slate-200 bg-white p-6">
                <div>
                    <h2 className="text-xl font-semibold text-slate-900">Customer</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Select an existing customer or create a new one.
                    </p>
                </div>

                <div className="relative mt-5">
                    <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">Select customer</span>
                        <input
                            value={displayValue}
                            onFocus={() => setMenuOpen(true)}
                            onBlur={() => window.setTimeout(() => setMenuOpen(false), 120)}
                            onChange={(e) => {
                                setMenuOpen(true);
                                onSearchChange(e.target.value);
                            }}
                            placeholder="Search by name, phone, email, or address"
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                        />
                    </label>

                    {menuOpen ? (
                        <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                            {existingClientsLoading ? (
                                <div className="px-4 py-3 text-sm text-slate-500">Loading customers...</div>
                            ) : existingClientsError ? (
                                <div className="px-4 py-3 text-sm text-rose-600">Could not load customers.</div>
                            ) : suggestions.length ? (
                                <div className="divide-y divide-slate-200">
                                    {suggestions.map((client) => (
                                        <button
                                            key={client.id}
                                            type="button"
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => {
                                                onSelectExistingClient(client);
                                                setMenuOpen(false);
                                            }}
                                            className="flex w-full flex-col items-start px-4 py-3 text-left hover:bg-slate-50"
                                        >
                                            <span className="font-medium text-slate-900">{client.name}</span>
                                            <span className="mt-1 text-sm text-slate-500">
                                                {[client.phone, client.email, client.address].filter(Boolean).join(" | ") || "No extra details"}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="px-4 py-3 text-sm text-slate-500">No customers found.</div>
                            )}

                            <div className="border-t border-slate-200 bg-slate-50 p-2">
                                <button
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => setCreateModalOpen(true)}
                                    className="w-full rounded-xl px-4 py-2.5 text-left text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                                >
                                    Create new customer
                                </button>
                            </div>
                        </div>
                    ) : null}
                </div>
            </section>

            {createModalOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onClick={() => setCreateModalOpen(false)}>
                    <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="border-b border-slate-200 px-6 py-5">
                            <h3 className="text-2xl font-semibold text-slate-900">Create new customer</h3>
                            <p className="mt-1 text-sm text-slate-500">
                                This customer will be attached when the job is created.
                            </p>
                        </div>

                        <div className="grid gap-4 px-6 py-5 md:grid-cols-2">
                            <label className="block md:col-span-2">
                                <span className="mb-1 block text-sm font-medium text-slate-700">Customer name</span>
                                <input
                                    value={newClient.name}
                                    onChange={(e) => onNewClientChange({ name: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                                />
                            </label>

                            <label className="block">
                                <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
                                <input
                                    value={newClient.email}
                                    onChange={(e) => onNewClientChange({ email: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                                />
                            </label>

                            <label className="block">
                                <span className="mb-1 block text-sm font-medium text-slate-700">Phone</span>
                                <input
                                    value={newClient.phone}
                                    onChange={(e) => onNewClientChange({ phone: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                                />
                            </label>

                            <label className="block md:col-span-2">
                                <span className="mb-1 block text-sm font-medium text-slate-700">Address line 1</span>
                                <input
                                    value={newClient.addressLine1}
                                    onChange={(e) => onNewClientChange({ addressLine1: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                                />
                            </label>

                            <label className="block md:col-span-2">
                                <span className="mb-1 block text-sm font-medium text-slate-700">Address line 2</span>
                                <input
                                    value={newClient.addressLine2}
                                    onChange={(e) => onNewClientChange({ addressLine2: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                                />
                            </label>

                            <label className="block">
                                <span className="mb-1 block text-sm font-medium text-slate-700">City</span>
                                <input
                                    value={newClient.city}
                                    onChange={(e) => onNewClientChange({ city: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                                />
                            </label>

                            <label className="block">
                                <span className="mb-1 block text-sm font-medium text-slate-700">Province / state</span>
                                <input
                                    value={newClient.province}
                                    onChange={(e) => onNewClientChange({ province: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                                />
                            </label>

                            <label className="block">
                                <span className="mb-1 block text-sm font-medium text-slate-700">Postal code</span>
                                <input
                                    value={newClient.postalCode}
                                    onChange={(e) => onNewClientChange({ postalCode: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                                />
                            </label>

                            <label className="block">
                                <span className="mb-1 block text-sm font-medium text-slate-700">Country</span>
                                <input
                                    value={newClient.country}
                                    onChange={(e) => onNewClientChange({ country: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                                />
                            </label>
                        </div>

                        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
                            <button
                                type="button"
                                onClick={() => setCreateModalOpen(false)}
                                className="rounded-2xl border border-slate-300 px-4 py-3 font-medium text-slate-700 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleCreateCustomerSave}
                                className="rounded-2xl bg-emerald-600 px-4 py-3 font-medium text-white hover:bg-emerald-700"
                            >
                                Add new customer
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}
