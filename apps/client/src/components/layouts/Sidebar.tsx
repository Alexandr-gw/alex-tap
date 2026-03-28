import { NavLink } from "react-router-dom";
import { useMe } from "@/features/me/hooks/useMe";
import { canManageCompany } from "@/features/me/me.selector.ts";

const links = [{ to: ".", label: "Dashboard" }];

const adminLinks = [
    { to: "schedule", label: "Schedule" },
    { to: "new-bookings", label: "New bookings" },
    { to: "jobs", label: "Jobs" },
    { to: "clients", label: "Clients" },
    { to: "settings", label: "Settings" },
    { to: "services", label: "Services" },
];

type Props = {
    mobileOpen?: boolean;
    onCloseMobile?: () => void;
};

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
    const { data: me } = useMe();
    const canManage = canManageCompany(me ?? null);

    const finalLinks = canManage ? [...links, ...adminLinks] : links;

    return (
        <div className="p-3">
            <div className="space-y-1">
                {finalLinks.map((link) => (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        onClick={onNavigate}
                        end={link.to === "."}
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
    );
}

export function Sidebar({ mobileOpen = false, onCloseMobile }: Props) {
    return (
        <>
            <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white md:block xl:w-72">
                <div className="flex h-14 items-center border-b border-slate-200 px-4">
                    <div className="text-sm font-semibold text-slate-900">Navigation</div>
                </div>

                <SidebarNav />
            </aside>

            {mobileOpen ? (
                <div className="fixed inset-0 z-50 md:hidden">
                    <button
                        type="button"
                        aria-label="Close navigation"
                        onClick={onCloseMobile}
                        className="absolute inset-0 bg-slate-950/40"
                    />

                    <aside className="absolute inset-y-0 left-0 flex w-[88vw] max-w-sm flex-col border-r border-slate-200 bg-white shadow-2xl">
                        <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4">
                            <div className="text-sm font-semibold text-slate-900">Navigation</div>
                            <button
                                type="button"
                                onClick={onCloseMobile}
                                className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700"
                            >
                                Close
                            </button>
                        </div>

                        <SidebarNav onNavigate={onCloseMobile} />
                    </aside>
                </div>
            ) : null}
        </>
    );
}
