import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown } from "lucide-react";
import { LogoutButton } from "@/features/auth/components/LogoutButton";
import { ActivityDrawer } from "@/features/activity/components/ActivityDrawer";
import { useRecentActivity } from "@/features/activity/hooks/activity.queries";
import { useMe } from "@/features/me/hooks/useMe";
import {
    canManageCompany,
    getActiveMembership,
    getDisplayName,
    getInitials,
    getRoleLabel,
} from "@/features/me/me.selector.ts";

export function Header() {
    const { data: me } = useMe();
    const [isActivityOpen, setIsActivityOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const profileMenuRef = useRef<HTMLDivElement | null>(null);

    const name = getDisplayName(me ?? null);
    const initials = getInitials(name);
    const roleLabel = getRoleLabel(me ?? null);
    const membership = getActiveMembership(me ?? null);
    const company = membership?.companyName;
    const canManage = canManageCompany(me ?? null);
    const recentActivity = useRecentActivity(24, canManage && isActivityOpen);
    const activityCount = recentActivity.data?.length ?? 0;

    useEffect(() => {
        if (!isProfileOpen) {
            return;
        }

        const handlePointerDown = (event: MouseEvent) => {
            if (!profileMenuRef.current?.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
        };

        window.addEventListener("mousedown", handlePointerDown);
        return () => window.removeEventListener("mousedown", handlePointerDown);
    }, [isProfileOpen]);

    return (
        <>
            <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur">
                <div className="flex h-14 w-full items-center justify-between px-4">
                    <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-sm font-semibold text-white shadow-sm">
                            A
                        </div>

                        <div className="leading-tight">
                            <div className="text-sm font-semibold text-slate-900">Alex-tap</div>
                            <div className="text-xs text-slate-500">{company ? company : "Dashboard"}</div>
                        </div>
                    </div>

                    <div className="flex min-w-[280px] items-center justify-end gap-2">
                        {canManage ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setIsProfileOpen(false);
                                    setIsActivityOpen(true);
                                }}
                                className="relative inline-flex h-11 w-11 flex-none items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                                aria-label="Open recent activity"
                            >
                                <Bell className="h-4 w-4" />
                                {activityCount > 0 ? (
                                    <span className="absolute right-1 top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-slate-900 px-1 text-[10px] font-semibold text-white">
                                        {activityCount > 9 ? "9+" : activityCount}
                                    </span>
                                ) : null}
                            </button>
                        ) : null}

                        <div className="relative" ref={profileMenuRef}>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsActivityOpen(false);
                                    setIsProfileOpen((current) => !current);
                                }}
                                className="inline-flex h-11 min-w-[200px] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 shadow-sm transition hover:bg-slate-50"
                                aria-haspopup="menu"
                                aria-expanded={isProfileOpen}
                            >
                                <span className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-600 text-xs font-semibold text-white">
                                    {initials}
                                </span>

                                <div className="min-w-0 flex-1 text-left leading-tight">
                                    <div className="truncate text-sm font-semibold text-slate-900">{name}</div>
                                    <div className="truncate text-xs text-slate-500">{roleLabel}</div>
                                </div>

                                <ChevronDown
                                    className={[
                                        "h-4 w-4 text-slate-500 transition-transform",
                                        isProfileOpen ? "rotate-180" : "",
                                    ].join(" ")}
                                />
                            </button>

                            {isProfileOpen ? (
                                <div className="absolute right-0 top-14 z-20 w-72 rounded-3xl border border-slate-200 bg-white p-3 shadow-2xl">
                                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                                        <div className="text-sm font-semibold text-slate-900">{name}</div>
                                        <div className="mt-1 text-xs text-slate-500">{me?.email ?? "No email on file"}</div>
                                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                            <span className="rounded-full bg-white px-2.5 py-1 text-slate-700">{roleLabel}</span>
                                            <span className="rounded-full bg-white px-2.5 py-1 text-slate-700">{company ?? "No company"}</span>
                                        </div>
                                    </div>
                                    <LogoutButton className="w-full" />
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            </header>

            <ActivityDrawer
                open={isActivityOpen}
                onClose={() => setIsActivityOpen(false)}
                items={recentActivity.data ?? []}
                isLoading={recentActivity.isLoading}
            />
        </>
    );
}
