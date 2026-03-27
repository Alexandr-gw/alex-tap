import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { usePublicBookingDetails, useRequestPublicBookingChanges } from "@/features/booking/hooks/booking.queries";

function formatMoney(cents: number, currency: string) {
    return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currency || "CAD",
    }).format(cents / 100);
}

function formatDateTime(value: string, timezone: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Unknown time";
    }

    return new Intl.DateTimeFormat(undefined, {
        dateStyle: "full",
        timeStyle: "short",
        timeZone: timezone,
    }).format(date);
}

function getStatusLabel(status: string) {
    switch (status) {
        case "PENDING_CONFIRMATION":
            return "Pending confirmation";
        case "SCHEDULED":
            return "Scheduled";
        case "DONE":
            return "Completed";
        case "CANCELED":
            return "Canceled";
        default:
            return status.replace(/_/g, " ").toLowerCase();
    }
}

export function BookingAccessPage() {
    const { accessToken } = useParams<{ accessToken: string }>();
    const detailsQ = usePublicBookingDetails(accessToken ?? null);
    const requestChangesM = useRequestPublicBookingChanges();
    const [requestSubmitted, setRequestSubmitted] = useState(false);

    const booking = detailsQ.data?.booking ?? null;

    const requestFeedback = useMemo(() => {
        if (requestChangesM.isSuccess) {
            return requestChangesM.data.message;
        }

        if (requestChangesM.isError) {
            return requestChangesM.error.message || "Unable to submit your request right now.";
        }

        return null;
    }, [requestChangesM.data, requestChangesM.error, requestChangesM.isError, requestChangesM.isSuccess]);

    return (
        <div className="min-h-screen bg-slate-50 px-4 py-10">
            <div className="mx-auto max-w-3xl">
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                    <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                        Booking confirmation
                    </div>

                    <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                        {booking?.title ?? "Your booking"}
                    </h1>

                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                        Review the confirmed details below. If something needs to change, send a request and the team will follow up with you.
                    </p>

                    {detailsQ.isLoading ? (
                        <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                            Loading your booking details...
                        </div>
                    ) : null}

                    {detailsQ.isError ? (
                        <div className="mt-8 rounded-3xl border border-rose-200 bg-rose-50 p-6">
                            <div className="text-base font-semibold text-rose-900">This booking link is unavailable.</div>
                            <p className="mt-2 text-sm leading-6 text-rose-800">
                                It may have expired or the booking could not be found. Please contact the business directly for help.
                            </p>
                            <div className="mt-4">
                                <Link
                                    to="/"
                                    className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
                                >
                                    Go home
                                </Link>
                            </div>
                        </div>
                    ) : null}

                    {booking ? (
                        <>
                            <div className="mt-8 grid gap-4 md:grid-cols-[1.3fr_0.9fr]">
                                <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                                        Appointment
                                    </div>
                                    <div className="mt-3 space-y-3 text-sm text-slate-700">
                                        <div>
                                            <div className="font-medium text-slate-900">{booking.serviceName}</div>
                                            <div>{formatDateTime(booking.scheduledAt, booking.timezone)}</div>
                                        </div>
                                        <div>
                                            <div className="text-slate-500">Location</div>
                                            <div className="font-medium text-slate-900">
                                                {booking.location || "Address will be confirmed by the team"}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-slate-500">Assigned team</div>
                                            <div className="font-medium text-slate-900">
                                                {booking.workerName || "To be assigned"}
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <section className="rounded-3xl border border-slate-200 bg-slate-950 p-5 text-white">
                                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/65">
                                        Booking status
                                    </div>
                                    <div className="mt-3 text-2xl font-semibold">
                                        {getStatusLabel(booking.status)}
                                    </div>
                                    <div className="mt-4 text-sm text-white/75">
                                        Total {formatMoney(booking.totalCents, booking.currency)}
                                    </div>
                                    {booking.paymentStatus ? (
                                        <div className="mt-2 text-sm text-white/75">
                                            Payment {booking.paymentStatus.toLowerCase().replace(/_/g, " ")}
                                        </div>
                                    ) : null}
                                </section>
                            </div>

                            <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-5">
                                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                                    Customer details
                                </div>
                                <div className="mt-3 grid gap-4 md:grid-cols-2">
                                    <div>
                                        <div className="text-sm text-slate-500">Name</div>
                                        <div className="text-sm font-medium text-slate-900">{booking.clientName}</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-slate-500">Email</div>
                                        <div className="text-sm font-medium text-slate-900">{booking.clientEmail || "Not provided"}</div>
                                    </div>
                                </div>
                                {booking.notes ? (
                                    <div className="mt-4">
                                        <div className="text-sm text-slate-500">Notes</div>
                                        <div className="text-sm font-medium leading-6 text-slate-900">{booking.notes}</div>
                                    </div>
                                ) : null}
                            </section>

                            <section className="mt-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
                                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
                                    Need to change something?
                                </div>
                                <p className="mt-3 text-sm leading-6 text-emerald-900">
                                    Send a request and {booking.companyName} will review the booking and follow up with you.
                                </p>
                                <div className="mt-4 flex flex-wrap gap-3">
                                    <button
                                        type="button"
                                        disabled={requestChangesM.isPending || requestSubmitted}
                                        onClick={async () => {
                                            if (!accessToken) return;
                                            try {
                                                const result = await requestChangesM.mutateAsync(accessToken);
                                                if (result.ok) {
                                                    setRequestSubmitted(true);
                                                }
                                            } catch {
                                                // handled via mutation state
                                            }
                                        }}
                                        className="inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {requestChangesM.isPending
                                            ? "Sending request..."
                                            : requestSubmitted
                                              ? "Request sent"
                                              : "Request changes"}
                                    </button>
                                    {booking.requestChangesEmail ? (
                                        <a
                                            href={`mailto:${booking.requestChangesEmail}`}
                                            className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
                                        >
                                            Email the team
                                        </a>
                                    ) : null}
                                </div>
                                {requestFeedback ? (
                                    <p
                                        className={[
                                            "mt-4 text-sm",
                                            requestChangesM.isError ? "text-rose-700" : "text-emerald-800",
                                        ].join(" ")}
                                    >
                                        {requestFeedback}
                                    </p>
                                ) : null}
                            </section>
                        </>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
