import {useMemo} from "react";
import {useSearchParams, Link} from "react-router-dom";

export function BookingSuccessPage() {
    const [params] = useSearchParams();
    const sessionId = params.get("session_id");

    const status = useMemo(() => {
        if (!sessionId) return "Missing session_id";
        return "Booking created. Payment processing…";
    }, [sessionId]);

    return (
        <div className="mx-auto max-w-xl p-6">
            <h1 className="text-xl font-semibold">
                Booking created 🎉
            </h1>

            <p className="mt-2 text-slate-700">{status}</p>

            {sessionId && (
                <p className="mt-2 text-xs text-slate-500">session_id: {sessionId}</p>
            )}

            <div className="mt-4 flex gap-4">
                <Link to="/" className="underline">Go home</Link>
            </div>
        </div>
    );
}