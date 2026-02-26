export function StepService({ wizard, servicesQ }: any) {
    if (servicesQ.isLoading) return <div>Loading services…</div>;
    if (servicesQ.isError) return <div>Failed to load services.</div>;

    const services = servicesQ.data?.services ?? [];

    return (
        <div className="space-y-3">
            <div className="text-sm text-slate-600">Choose a service</div>

            <div className="space-y-2">
                {services.map((s: any) => (
                    <button
                        key={s.id}
                        className="w-full rounded-xl border p-3 text-left hover:bg-slate-50"
                        onClick={() => {
                            wizard.dispatch({ type: "SET_SERVICE", serviceId: s.id });
                            wizard.next();
                        }}
                    >
                        <div className="font-medium">{s.name}</div>
                        <div className="text-sm text-slate-600">
                            {s.durationMins} mins • {(s.basePriceCents / 100).toFixed(2)} {s.currency ?? ""}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}