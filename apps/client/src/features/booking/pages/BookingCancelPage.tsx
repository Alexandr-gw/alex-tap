import { Link, useSearchParams } from "react-router-dom";
import { getLastActiveBookingSlug } from "@/features/booking/draft.utils";

export function BookingCancelPage() {
    const [sp] = useSearchParams();
    const sessionId = sp.get("session_id");
    const companySlug = sp.get("companySlug") ?? getLastActiveBookingSlug();
    const bookingPath = companySlug ? `/book/${companySlug}` : "/";

    return (
        <div className="mx-auto max-w-2xl p-6">
            <h1 className="text-2xl font-semibold">Payment canceled</h1>

            <p className="mt-3 text-slate-600">
                No worries — you can try again whenever you’re ready.
            </p>

            {sessionId && (
                <p className="mt-2 text-sm text-slate-500">
                    Session: <code className="rounded bg-slate-100 px-1">{sessionId}</code>
                </p>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                    to="/"
                    className="inline-flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white sm:w-auto"
                >
                    Go home
                </Link>
                <Link
                    to={bookingPath}
                    className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium sm:w-auto"
                >
                    Back to booking
                </Link>
            </div>
        </div>
    );
}
