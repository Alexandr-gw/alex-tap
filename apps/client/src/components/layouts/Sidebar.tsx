// Sidebar.tsx
import { NavLink } from "react-router-dom";

const links = [
    { to: ".", label: "Dashboard" },       // /app
    { to: "tracking", label: "Tracking" }, // /app/tracking
    { to: "jobs", label: "Jobs" },
    { to: "customers", label: "Customers" },
    { to: "settings", label: "Settings" },
];

export function Sidebar() {
    return (
        <aside className="hidden w-72 border-r border-slate-200 bg-white md:block">
            <div className="flex h-14 items-center border-b border-slate-200 px-4">
                <div className="text-sm font-semibold text-slate-900">Navigation</div>
            </div>

            <div className="p-3">
                <div className="space-y-1">
                    {links.map((l) => (
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

                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-sm font-semibold text-slate-900">Tip</div>
                    <p className="mt-1 text-xs text-slate-600">
                        Tracking will become a full-map view with panels you open as needed.
                    </p>
                </div>
            </div>
        </aside>
    );
}
