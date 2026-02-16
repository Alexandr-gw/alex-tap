import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useMe } from "@/features/me/hooks/useMe";

export default function SelectCompanyPage() {
    const { data, isLoading } = useMe();
    const qc = useQueryClient();
    const nav = useNavigate();

    if (isLoading) return <div className="p-6">Loading…</div>;
    if (!data) return null;

    return (
        <div className="min-h-screen grid place-items-center p-6">
            <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-sm">
                <h1 className="text-xl font-semibold">Choose a company</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    You belong to multiple companies. Pick one to continue.
                </p>

                <div className="mt-6 grid gap-3">
                    {data.memberships.map((m) => (
                        <button
                            key={m.companyId}
                            className="flex items-center justify-between rounded-xl border p-4 text-left hover:bg-muted"
                            onClick={async () => {
                                localStorage.setItem("activeCompanyId", m.companyId);
                                await qc.invalidateQueries({ queryKey: ["me"] });
                                nav("/app", { replace: true });
                            }}
                        >
                            <div>
                                <div className="font-medium">{m.companyName}</div>
                                <div className="text-sm text-muted-foreground">{m.role}</div>
                            </div>
                            <span className="text-sm text-muted-foreground">Select →</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
