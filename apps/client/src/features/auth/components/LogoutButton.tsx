import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { logout } from "@/features/auth/api/auth.api";

export function LogoutButton() {
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
                "ml-2 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
                "border border-slate-200 bg-white text-slate-700 shadow-sm",
                "hover:bg-slate-50 hover:text-slate-900",
                "disabled:opacity-50 disabled:cursor-not-allowed",
            ].join(" ")}
        >
            {/* icon */}
            <span className="text-xs">
        {loading ? "…" : "⎋"}
      </span>

            {loading ? "Signing out..." : "Logout"}
        </button>
    );
}
