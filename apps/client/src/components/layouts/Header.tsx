import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { LogoutButton } from "@/features/auth/components/LogoutButton";
import { useMe } from "@/features/me/hooks/useMe";
import {
    canManageCompany,
    getActiveMembership,
    getDisplayName,
    getInitials,
    getRoleLabel,
} from "@/features/me/me.selector.ts";
import { useAlertsList, useAlertsUnreadCount } from "@/features/alerts/hooks/alerts.queries";

export function Header() {
    const { data: me } = useMe();
    const [open, setOpen] = useState(false);

    const name = getDisplayName(me ?? null);
    const initials = getInitials(name);
    const roleLabel = getRoleLabel(me ?? null);
    const membership = getActiveMembership(me ?? null);
    const company = membership?.companyName;
    const canManage = canManageCompany(me ?? null);

    const unread = useAlertsUnreadCount(canManage);
    const recentAlerts = useAlertsList("OPEN", canManage && open);

    return (
        <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur">
            <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-4">
                <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-sm font-semibold text-white shadow-sm">
                        A
                    </div>

                    <div className="leading-tight">
                        <div className="text-sm font-semibold text-slate-900">Alex-tap</div>
                        <div className="text-xs text-slate-500">{company ? company : "Dashboard"}</div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {canManage ? (
                        <div className="relative">
                            <button
                                onClick={() => setOpen((current) => !current)}
                                className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
                                aria-label="Open alerts"
                            >
                                <Bell className="h-4 w-4" />
                                {(unread.data?.count ?? 0) > 0 ? (
                                    <span className="absolute right-1 top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                                        {unread.data?.count}
                                    </span>
                                ) : null}
                            </button>

                            {open ? (
                                <div className="absolute right-0 top-12 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                                    <div className="flex items-center justify-between px-2 pb-2">
                                        <div>
                                            <div className="text-sm font-semibold text-slate-900">Alerts</div>
                                            <div className="text-xs text-slate-500">Pending booking confirmations</div>
                                        </div>
                                        <Link
                                            to="/app/jobs"
                                            onClick={() => setOpen(false)}
                                            className="text-xs font-medium text-sky-700 hover:text-sky-800"
                                        >
                                            Open inbox
                                        </Link>
                                    </div>

                                    <div className="space-y-2">
                                        {recentAlerts.data?.items?.slice(0, 3).map((alert) => (
                                            <Link
                                                key={alert.id}
                                                to={`/app/jobs?alertId=${alert.id}`}
                                                onClick={() => setOpen(false)}
                                                className="block rounded-xl border border-slate-200 px-3 py-2 hover:bg-slate-50"
                                            >
                                                <div className="text-sm font-medium text-slate-900">{alert.job.clientName}</div>
                                                <div className="mt-1 text-xs text-slate-500">{alert.job.serviceName} with {alert.job.workerName ?? "unassigned"}</div>
                                            </Link>
                                        ))}

                                        {!recentAlerts.data?.items?.length ? (
                                            <div className="rounded-xl bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
                                                No pending alerts.
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    ) : null}

                    <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                        <span className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-600 text-xs font-semibold text-white">
                            {initials}
                        </span>

                        <div className="leading-tight">
                            <div className="text-sm font-semibold text-slate-900">{name}</div>
                            <div className="text-xs text-slate-500">{roleLabel}</div>
                        </div>
                    </div>

                    <LogoutButton />
                </div>
            </div>
        </header>
    );
}
