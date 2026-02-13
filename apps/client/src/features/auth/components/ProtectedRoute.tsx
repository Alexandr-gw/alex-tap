import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useMe } from "@/features/auth/hooks/useMe";

export function ProtectedRoute() {
    const loc = useLocation();
    const { data, isLoading, isError } = useMe();

    if (isLoading) return <div className="p-6">Loading…</div>;

    if (isError || !data) {
        return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
    }

    return <Outlet />;
}
