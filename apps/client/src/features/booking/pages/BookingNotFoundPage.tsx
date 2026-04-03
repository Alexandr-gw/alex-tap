import { Link } from "react-router-dom";

type Props = {
    companySlug?: string | null;
};

export function BookingNotFoundPage({ companySlug }: Props) {
    return (
        <div className="min-h-dvh bg-[linear-gradient(180deg,#f4fbf8_0%,#f7fbff_35%,#ffffff_100%)] px-4 py-16 text-slate-900 sm:px-6">
            <div className="mx-auto max-w-3xl">
                <div className="rounded-[2rem] border border-white/80 bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:p-10">
                    <div className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
                        Booking page not found
                    </div>

                    <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                        This booking page does not exist.
                    </h1>

                    <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                        The booking link may be incorrect, unpublished, or no longer available.
                        {companySlug ? ` We could not find a public booking page for "${companySlug}".` : ""}
                    </p>

                    <div className="mt-8 flex flex-wrap gap-3">
                        <Link
                            to="/"
                            className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(16,185,129,0.24)] transition hover:bg-emerald-600"
                        >
                            Back to home
                        </Link>

                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                            className="rounded-2xl border border-sky-200 bg-sky-50 px-5 py-3 text-sm font-semibold text-sky-800 transition hover:bg-sky-100"
                        >
                            Try again
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
