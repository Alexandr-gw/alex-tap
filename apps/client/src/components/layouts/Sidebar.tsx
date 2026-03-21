import { NavLink } from "react-router-dom";
import { useMe } from "@/features/me/hooks/useMe";
import { canManageCompany } from "@/features/me/me.selector.ts";

const links = [{ to: ".", label: "Dashboard" }];

const adminLinks = [
    { to: "schedule", label: "Schedule" },
    { to: "clients", label: "Clients" },
    { to: "settings", label: "Settings" },
    { to: "jobs", label: "Jobs" },
    { to: "services", label: "Services" },
];

export function Sidebar() {
    const { data: me } = useMe();
    const canManage = canManageCompany(me ?? null);

    const finalLinks = canManage ? [...links, ...adminLinks] : links;

    return (
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white md:block xl:w-72">
            <div className="flex h-14 items-center border-b border-slate-200 px-4">
                <div className="text-sm font-semibold text-slate-900">Navigation</div>
            </div>

            <div className="p-3">
                <div className="space-y-1">
                    {finalLinks.map((link) => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            className={({ isActive }) =>
                                [
                                    "flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition",
                                    isActive
                                        ? "bg-indigo-50 text-indigo-800"
                                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                                ].join(" ")
                            }
                        >
                            <span>{link.label}</span>
                        </NavLink>
                    ))}
                </div>
            </div>
        </aside>
    );
}
