import { useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useCheckoutSessionSummary } from "@/features/booking/hooks/payment.queries";
import { useMe } from "@/features/me/hooks/useMe";

function formatMoney(cents: number, currency: string) {
    const amount = cents / 100;
    return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currency || "CAD",
    }).format(amount);
}

function getFriendlyPaymentStatus(status: string) {
    switch (status) {
        case "SUCCEEDED":
            return "Successful";
        case "FAILED":
            return "Failed";
        case "REFUNDED":
            return "Refunded";
        default:
            return "Processing";
    }
}

function getMessageBoxClasses(status: string) {
    switch (status) {
        case "SUCCEEDED":
            return "mt-4 rounded-lg border border-green-200 bg-green-50 p-4";
        case "FAILED":
            return "mt-4 rounded-lg border border-red-200 bg-red-50 p-4";
        case "REFUNDED":
            return "mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4";
        default:
            return "mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4";
    }
}

function getMessageTextClasses(status: string) {
    switch (status) {
        case "SUCCEEDED":
            return "text-sm text-green-900";
        case "FAILED":
            return "text-sm text-red-900";
        case "REFUNDED":
            return "text-sm text-slate-900";
        default:
            return "text-sm text-amber-900";
    }
}

export function BookingSuccessPage() {
    const [sp] = useSearchParams();
    const sessionId = sp.get("session_id");

    const { data, isLoading, isError, error } = useCheckoutSessionSummary(
        sessionId,
        "public",
    );
    const meQ = useMe(null);
    const canOpenDashboard = !!meQ.data && !meQ.isError;

    const title = useMemo(() => {
        if (!sessionId) return "Missing session_id";
        if (isLoading) return "Checking payment...";
        if (isError) return "Couldn't load payment";
        if (!data) return "Checking payment...";

        if (data.status === "SUCCEEDED") return "Payment successful";
        if (data.status === "FAILED") return "Payment failed";
        if (data.status === "REFUNDED") return "Payment refunded";

        return "Payment processing...";
    }, [sessionId, isLoading, isError, data]);

    const isTerminalStatus =
        data?.status === "SUCCEEDED" ||
        data?.status === "FAILED" ||
        data?.status === "REFUNDED";

    return (
        <div className="mx-auto max-w-2xl p-6">
            <h1 className="text-2xl font-semibold">{title}</h1>

            {!sessionId && (
                <p className="mt-3 text-slate-600">
                    This page needs{" "}
                    <code className="rounded bg-slate-100 px-1">session_id</code> in the
                    URL.
                </p>
            )}

            {isLoading && sessionId && (
                <p className="mt-3 text-slate-600">One moment...</p>
            )}

            {isError && sessionId && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
                    <p className="font-medium text-red-900">Something went wrong.</p>
                    <p className="mt-1 text-sm text-red-900/80">
                        {error instanceof Error ? error.message : "Unknown error"}
                    </p>
                </div>
            )}

            {data && (
                <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-2">
                        <div className="text-slate-700">
                            <span className="font-medium">Service:</span> {data.serviceName}
                        </div>

                        <div className="text-slate-700">
                            <span className="font-medium">Amount:</span>{" "}
                            {formatMoney(data.amountCents, data.currency)}
                        </div>

                        {data.clientName && (
                            <div className="text-slate-700">
                                <span className="font-medium">Customer:</span> {data.clientName}
                            </div>
                        )}

                        <div className="text-slate-700">
                            <span className="font-medium">Payment status:</span>{" "}
                            {getFriendlyPaymentStatus(data.status)}
                        </div>

                        {data.scheduledAt && (
                            <div className="text-slate-700">
                                <span className="font-medium">Scheduled:</span>{" "}
                                {new Date(data.scheduledAt).toLocaleString()}
                            </div>
                        )}

                        {data.customerMessage && (
                            <div className={getMessageBoxClasses(data.status)}>
                                <p className={getMessageTextClasses(data.status)}>
                                    {data.customerMessage}
                                </p>
                            </div>
                        )}

                        {data.receiptUrl && (
                            <div className="pt-2">
                                <a
                                    className="text-sm font-medium text-sky-700 hover:underline"
                                    href={data.receiptUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    View receipt
                                </a>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                        {data.status === "SUCCEEDED" ? (
                            <>
                                <Link
                                    to="/"
                                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                                >
                                    Go home
                                </Link>

                                {canOpenDashboard && (
                                    <Link
                                        to="/app"
                                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium"
                                    >
                                        Open dashboard
                                    </Link>
                                )}
                            </>
                        ) : (
                            <Link
                                to="/"
                                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium"
                            >
                                Back
                            </Link>
                        )}
                    </div>

                    {!isTerminalStatus && (
                        <p className="mt-4 text-sm text-slate-600">
                            If you just paid, it can take a moment to confirm. This page will
                            refresh automatically.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
