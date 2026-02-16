// src/components/layout/Header.tsx
import { LogoutButton } from "@/features/auth/components/LogoutButton";
import { useMe } from "@/features/me/hooks/useMe";
import {
    getActiveMembership,
    getDisplayName,
    getInitials,
    getRoleLabel,
} from "@/features/me/me.selector.ts";
export function Header() {
    const { data: me} = useMe();

    // --- derive UI values ---
    const name = getDisplayName(me ?? null);
    const initials = getInitials(name);
    const roleLabel = getRoleLabel(me ?? null);

    const membership = getActiveMembership(me ?? null);
    const company = membership?.companyName;

    return (
        <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur">
            <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-4">

                {/* LEFT: APP TITLE */}
                <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-sm font-semibold text-white shadow-sm">
                        A
                    </div>

                    <div className="leading-tight">
                        <div className="text-sm font-semibold text-slate-900">
                            Alex-tap
                        </div>

                        <div className="text-xs text-slate-500">
                            {company ? company : "Dashboard"}
                        </div>
                    </div>
                </div>

                {/* RIGHT: USER BLOCK */}
                <div className="flex items-center gap-2">
                    <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">

                        {/* Avatar */}
                        <span className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-600 text-xs font-semibold text-white">
              {initials}
            </span>

                        {/* Name + role */}
                        <div className="leading-tight">
                            <div className="text-sm font-semibold text-slate-900">
                                {name}
                            </div>
                            <div className="text-xs text-slate-500">
                                {roleLabel}
                            </div>
                        </div>
                    </div>

                    {/* Logout */}
                    <LogoutButton />
                </div>
            </div>
        </header>
    );
}
