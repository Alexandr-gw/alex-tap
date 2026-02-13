// Header.tsx
import { NavLink } from "react-router-dom";
import { LogoutButton } from "@/features/auth/components/LogoutButton";

export function Header() {
    return (
        <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur">
            <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-4">
                <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-sm font-semibold text-white shadow-sm">
                        A
                    </div>
                    <div className="leading-tight">
                        <div className="text-sm font-semibold text-slate-900">Alex-tap</div>
                        <div className="text-xs text-slate-500">Dashboard</div>
                    </div>
                </div>

                <nav className="flex items-center gap-2">
                    <NavLink
                        to="/app"
                        className={({ isActive }) =>
                            [
                                "rounded-xl px-3 py-2 text-sm font-medium transition",
                                isActive ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-100",
                            ].join(" ")
                        }
                    >
                        Home
                    </NavLink>

                    <NavLink
                        to="/app/tracking"
                        className={({ isActive }) =>
                            [
                                "rounded-xl px-3 py-2 text-sm font-medium transition",
                                isActive ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-100",
                            ].join(" ")
                        }
                    >
                        Tracking
                    </NavLink>

                    <button className="ml-2 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-600 text-xs font-semibold text-white">
              U
            </span>
                        User
                    </button>
                    <LogoutButton />
                </nav>
            </div>
        </header>
    );
}
