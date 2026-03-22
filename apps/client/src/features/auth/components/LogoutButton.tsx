import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { logout } from "@/features/auth/api/auth.api";

type Props = {
    className?: string;
};

export function LogoutButton({ className }: Props) {
    const qc = useQueryClient();
    const nav = useNavigate();
    const [loading, setLoading] = useState(false);

    const handleLogout = async () => {
        if (loading) return;
        setLoading(true);

        try {
            await logout();
        } finally {
            localStorage.removeItem("activeCompanyId");
            qc.removeQueries({ queryKey: ["me"] });
            nav("/login", { replace: true });
        }
    };

    return (
        <button
            onClick={handleLogout}
            disabled={loading}
            className={[
                "inline-flex h-11 min-w-[120px] items-center justify-center rounded-2xl px-4 text-sm font-semibold transition",
                "border border-rose-200 bg-rose-50 text-rose-700 shadow-sm",
                "hover:border-rose-300 hover:bg-rose-100 hover:text-rose-800",
                "disabled:cursor-not-allowed disabled:opacity-50",
                className ?? "",
            ].join(" ")}
        >
            {loading ? "Signing out..." : "Logout"}
        </button>
    );
}
