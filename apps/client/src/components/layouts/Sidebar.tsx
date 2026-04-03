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
            <div className="space-y-1.5">
                {finalLinks.map((link) => (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        onClick={onNavigate}
                        end={link.to === "."}
                        className={({ isActive }) =>
                            [
                                "flex items-center justify-between rounded-2xl border px-3 py-2.5 text-sm font-medium transition cursor-pointer",
                                isActive
                                    ? "border-emerald-200 bg-[linear-gradient(135deg,#ecfbf3_0%,#eef7ff_100%)] text-slate-900 shadow-sm"
                                    : "border-transparent text-slate-600 hover:border-sky-100 hover:bg-[linear-gradient(135deg,#f2fcf6_0%,#f5faff_100%)] hover:text-slate-900",
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
            <aside className="hidden w-64 shrink-0 border-r border-emerald-100/80 bg-[linear-gradient(180deg,#f6fcf8_0%,#f9fbff_58%,#ffffff_100%)] md:block xl:w-72">
                <div className="flex h-14 items-center border-b border-emerald-100/80 px-4">
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

                    <aside className="absolute inset-y-0 left-0 flex w-[88vw] max-w-sm flex-col border-r border-emerald-100/80 bg-[linear-gradient(180deg,#f6fcf8_0%,#f9fbff_58%,#ffffff_100%)] shadow-2xl">
                        <div className="flex h-14 items-center justify-between border-b border-emerald-100/80 px-4">
                            <div className="text-sm font-semibold text-slate-900">Navigation</div>
                            <button
                                type="button"
                                onClick={onCloseMobile}
                                className="rounded-xl border border-sky-100 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-sky-200 hover:bg-sky-50"
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
