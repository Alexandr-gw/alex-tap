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
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
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
        <CompanySettingsForm
            company={companyQuery.data}
            isSaving={updateMutation.isPending}
            onSubmit={async (input) => {
                await updateMutation.mutateAsync(input);
            }}
        />
    );
}