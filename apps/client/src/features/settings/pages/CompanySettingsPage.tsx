import { CompanySettingsForm } from "../components/CompanySettingsForm";
import {
    useCompanySettings,
    useUpdateCompanySettings,
} from "../hooks/settings.queries";

export function CompanySettingsPage() {
    const companyQuery = useCompanySettings();
    const updateMutation = useUpdateCompanySettings();

    if (companyQuery.isLoading) {
        return (
            <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
                <p className="text-sm text-slate-500">Loading company settings...</p>
            </div>
        );
    }

    if (companyQuery.isError || !companyQuery.data) {
        return (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
                <h1 className="text-lg font-semibold text-red-800">
                    Failed to load company settings
                </h1>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <section className="rounded-[2rem] border border-emerald-100/80 bg-[linear-gradient(135deg,#ffffff_0%,#effcf5_44%,#eef7ff_100%)] p-6 shadow-sm">
                <div className="max-w-2xl">
                    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
                        Company settings
                    </div>
                    <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                        Configure your public booking presence and company defaults.
                    </h1>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                        Keep your booking slug, timezone, and business details aligned with the customer-facing experience.
                    </p>
                </div>
            </section>

            <CompanySettingsForm
                company={companyQuery.data}
                isSaving={updateMutation.isPending}
                onSubmit={async (input) => {
                    await updateMutation.mutateAsync(input);
                }}
            />
        </div>
    );
}
