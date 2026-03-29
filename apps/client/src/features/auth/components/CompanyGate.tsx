import { Navigate, Outlet } from "react-router-dom";
import { useMe } from "@/features/me/hooks/useMe";

export function CompanyGate() {
    const { data, isLoading } = useMe();

    if (isLoading) return <div className="p-6">Loading…</div>;
    if (!data) return <Navigate to="/login" replace />;

    // Force company pick if multiple and none selected
    const mustPick = data.memberships.length > 1 && !data.activeCompanyId;
    if (mustPick) return <Navigate to="/select-company" replace />;

    return <Outlet />;
}
