import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useMe } from "@/features/me/hooks/useMe";

export function ProtectedRoute() {
    const loc = useLocation();
    const { data, isLoading, isError } = useMe();
    const returnTo = `${loc.pathname}${loc.search}${loc.hash}`;

    if (isLoading) return <div className="p-6">Loading…</div>;

    if (isError || !data) {
        return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />;
    }

    return <Outlet />;
}
