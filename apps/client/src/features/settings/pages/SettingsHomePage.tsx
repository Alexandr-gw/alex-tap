import { CompanySettingsForm } from "../components/CompanySettingsForm";
import { SettingsNavCard } from "../components/SettingsNavCard";
import { useCompanySettings, useUpdateCompanySettings } from "../hooks/settings.queries";

export function SettingsHomePage() {
    const companyQuery = useCompanySettings();
    const updateMutation = useUpdateCompanySettings();

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>

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
                        <div className="rounded-2xl border bg-white p-6 shadow-sm">
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
