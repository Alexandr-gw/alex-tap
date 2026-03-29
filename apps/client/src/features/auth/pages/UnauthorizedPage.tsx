import { Link } from "react-router-dom";
import { startLogin } from "@/features/auth/api/auth.api.ts";

export default function UnauthorizedPage() {
    return (
        <div className="min-h-dvh bg-[linear-gradient(180deg,#f4fbf8_0%,#f7fbff_35%,#ffffff_100%)] px-4 py-16 text-slate-900 sm:px-6">
            <div className="mx-auto max-w-3xl">
                <div className="rounded-[2rem] border border-white/80 bg-white/90 p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:p-10">
                    <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                        Access limited
                    </div>

                    <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                        You do not have access to this page.
                    </h1>
                    <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
                        Your account is signed in, but this area is only available to team members with the required role.
                    </p>

                    <div className="mt-8 flex flex-wrap justify-center gap-3">
                        <Link
                            className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(16,185,129,0.24)] transition hover:bg-emerald-600"
                            to="/app"
                        >
                            Go to dashboard
                        </Link>
                        <button
                            type="button"
                            onClick={() => void startLogin("/app")}
                            className="rounded-2xl border border-sky-200 bg-sky-50 px-5 py-3 text-sm font-semibold text-sky-800 transition hover:bg-sky-100"
                        >
                            Back to login
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
