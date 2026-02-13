import { Navigate, Outlet } from "react-router-dom";
import { useMe } from "../hooks/useMe";

export function PublicOnlyRoute() {
    const { data, isLoading } = useMe();

    if (isLoading) return <div className="p-6">Loading…</div>;

    if (data) return <Navigate to="/app" replace />;

    return <Outlet />;
}
