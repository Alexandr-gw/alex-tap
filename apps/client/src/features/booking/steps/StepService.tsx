import { useMemo, useState } from "react";

const INITIAL_VISIBLE_SERVICES = 6;

function formatMoney(amountCents: number, currency: string | null | undefined) {
    return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currency || "CAD",
    }).format(amountCents / 100);
}

export function StepService({ wizard, servicesQ }: any) {
    const [search, setSearch] = useState("");
    const [showAll, setShowAll] = useState(false);
    const services = servicesQ.data?.services ?? [];
    const normalizedSearch = search.trim().toLowerCase();
    const filteredServices = useMemo(() => {
        if (!normalizedSearch) {
            return services;
        }

        return services.filter((service: any) =>
            service.name.toLowerCase().includes(normalizedSearch),
        );
    }, [normalizedSearch, services]);
    const visibleServices =
        showAll || normalizedSearch
            ? filteredServices
            : filteredServices.slice(0, INITIAL_VISIBLE_SERVICES);

    if (servicesQ.isLoading) return <div>Loading services...</div>;
    if (servicesQ.isError) return <div>Failed to load services.</div>;

    return (
        <div className="space-y-4">
            <div className="space-y-3">
                <div className="text-sm text-slate-600">Choose a service</div>
                <input
                    type="text"
                    value={search}
                    onChange={(event) => {
                        setSearch(event.target.value);
                        if (event.target.value.trim()) {
                            setShowAll(true);
                        }
                    }}
                    placeholder="Search services"
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                />
            </div>

            <div className="space-y-2">
                {visibleServices.map((service: any) => (
                    <button
                        key={service.id}
                        className="w-full rounded-2xl border border-slate-200 p-4 text-left transition hover:bg-slate-50"
                        onClick={() => {
                            wizard.dispatch({ type: "SET_SERVICE", serviceId: service.id });
                            wizard.next();
                        }}
                    >
                        <div className="font-medium text-slate-900">{service.name}</div>
                        <div className="mt-1 text-sm text-slate-600">
                            {service.durationMins} mins • {formatMoney(service.basePriceCents, service.currency)}
                        </div>
                    </button>
                ))}

                {!visibleServices.length ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                        No services match that search yet.
                    </div>
                ) : null}
            </div>

            {!normalizedSearch && filteredServices.length > INITIAL_VISIBLE_SERVICES ? (
                <button
                    type="button"
                    onClick={() => setShowAll((current) => !current)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                    {showAll ? "Show fewer services" : `Show all ${filteredServices.length} services`}
                </button>
            ) : null}
        </div>
    );
}
