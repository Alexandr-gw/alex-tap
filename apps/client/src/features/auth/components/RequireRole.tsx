import { Navigate, Outlet } from "react-router-dom";
import type { MembershipRole } from "../api/me";
import { useMe } from "@/features/me/hooks/useMe";

export function RequireRole({ allow }: { allow: MembershipRole[] }) {
    const { data, isLoading } = useMe();
    if (isLoading) return <div className="p-6">Loading…</div>;
    if (!data) return <Navigate to="/login" replace />;

    const active = data.activeCompanyId;
    const membership = data.memberships.find((m) => m.companyId === active);
    const role = membership?.role;

    if (!role || !allow.includes(role)) return <Navigate to="/401" replace />;

    return <Outlet />;
}
