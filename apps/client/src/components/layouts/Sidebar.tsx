// Sidebar.tsx
import { NavLink } from "react-router-dom";
import { useMe } from "@/features/me/hooks/useMe";
import { canManageCompany } from "@/features/me/me.selector.ts";

const links = [
    { to: ".", label: "Dashboard" },
    { to: "tracking", label: "Tracking" },
    { to: "jobs", label: "Jobs" },
    { to: "customers", label: "Customers" },
    { to: "settings", label: "Settings" },
];

const adminLinks = [
    { to: "services", label: "Services" },
    { to: "users", label: "Users" },
];

export function Sidebar() {
    const { data: me } = useMe();
    const canManage = canManageCompany(me ?? null);

    const finalLinks = canManage ? [...links, ...adminLinks] : links;

    return (
        <aside className="hidden w-72 border-r border-slate-200 bg-white md:block">
            <div className="flex h-14 items-center border-b border-slate-200 px-4">
                <div className="text-sm font-semibold text-slate-900">Navigation</div>
            </div>

            <div className="p-3">
                <div className="space-y-1">
                    {finalLinks.map((l) => (
                        <NavLink
                            key={l.to}
                            to={l.to}
                            className={({ isActive }) =>
                                [
                                    "flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition",
                                    isActive
                                        ? "bg-indigo-50 text-indigo-800"
                                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                                ].join(" ")
                            }
                        >
                            <span>{l.label}</span>

                            {l.to === "tracking" ? (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                  Live
                </span>
                            ) : null}
                        </NavLink>
                    ))}
                </div>
            </div>
        </aside>
    );
}
