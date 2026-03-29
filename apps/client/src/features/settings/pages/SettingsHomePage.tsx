import { CompanySettingsForm } from "../components/CompanySettingsForm";
import { SettingsNavCard } from "../components/SettingsNavCard";
import { useCompanySettings, useUpdateCompanySettings } from "../hooks/settings.queries";

export function SettingsHomePage() {
    const companyQuery = useCompanySettings();
    const updateMutation = useUpdateCompanySettings();

    return (
        <div className="space-y-6">
            <section className="rounded-[2rem] border border-emerald-100/80 bg-[linear-gradient(135deg,#ffffff_0%,#effcf5_44%,#eef7ff_100%)] p-6 shadow-sm">
                <div className="max-w-2xl">
                    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
                        Settings
                    </div>
                    <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                        Manage company details, booking setup, and worker configuration.
                    </h1>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                        This is the control room for public booking setup and internal operating defaults.
                    </p>
                </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
                <div>
                    <SettingsNavCard
                        title="Workers"
                        description="Manage worker profiles used in schedule and job assignment."
                        to="/app/settings/workers"
                        compact
                    />
                </div>

                <div>
                    {companyQuery.isLoading ? (
                        <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
                            <p className="text-sm text-slate-500">Loading company settings...</p>
                        </div>
                    ) : companyQuery.isError || !companyQuery.data ? (
                        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
                            <h2 className="text-lg font-semibold text-red-800">Failed to load company settings</h2>
                        </div>
                    ) : (
                        <CompanySettingsForm
                            company={companyQuery.data}
                            isSaving={updateMutation.isPending}
                            onSubmit={async (input) => {
                                await updateMutation.mutateAsync(input);
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
