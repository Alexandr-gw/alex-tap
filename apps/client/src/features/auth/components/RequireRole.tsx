// RequireRole.tsx
import { Navigate, Outlet } from "react-router-dom";
import { useMe, type MembershipRole } from "@/features/me/hooks/useMe";
import { getEffectiveRole } from "@/features/me/me.selector"; // <- use the same source

export function RequireRole({ allow }: { allow: MembershipRole[] }) {
    const { data, isLoading } = useMe(null);

    if (isLoading) return <div className="p-6">Loading…</div>;
    if (!data) return <Navigate to="/login" replace />;

    const role = getEffectiveRole(data as any); // ideally fix types to match instead of `any`
    if (!role || !allow.includes(role)) return <Navigate to="/401" replace />;

    return <Outlet />;
}
