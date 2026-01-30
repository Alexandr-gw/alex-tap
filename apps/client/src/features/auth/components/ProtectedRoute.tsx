import { Navigate, Outlet } from "react-router-dom";
import { useMe } from "../hooks/useMe";

export function ProtectedRoute() {
    const { data, isLoading, isError } = useMe();

    if (isLoading) return <div className="p-6">Loading…</div>;
    if (isError || !data) return <Navigate to="/login" replace />;

    return <Outlet />;
}
