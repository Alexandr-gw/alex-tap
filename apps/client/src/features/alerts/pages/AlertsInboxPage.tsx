import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useAlertDetail, useAlertsList, useMarkAlertRead, useReviewJob } from "@/features/alerts/hooks/alerts.queries";
import type { AlertDetail, AlertListItem } from "@/features/alerts/api/alerts.types";

function formatMoney(amountCents: number, currency: string) {
    return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currency || "CAD",
    }).format(amountCents / 100);
}

function formatDateTime(value: string) {
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
}

function toDateTimeLocal(value: string) {
    const date = new Date(value);
    const pad = (part: number) => String(part).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDateTimeLocal(value: string) {
    return new Date(value).toISOString();
}

function paymentTone(status: string | null | undefined) {
    if (status === "SUCCEEDED") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (status === "FAILED" || status === "CANCELED" || status === "REFUNDED") return "bg-rose-50 text-rose-700 border-rose-200";
    return "bg-amber-50 text-amber-700 border-amber-200";
}

function AlertRow({
    alert,
    selected,
}: {
    alert: AlertListItem;
    selected: boolean;
}) {
    return (
        <div
            className={[
                "rounded-2xl border p-4 transition",
                selected
                    ? "border-emerald-300 bg-[linear-gradient(135deg,#ecfbf3_0%,#eef7ff_100%)] text-slate-900 shadow-sm"
                    : "border-sky-100 bg-white hover:border-emerald-200 hover:bg-[linear-gradient(135deg,#f7fcf9_0%,#f7fbff_100%)]",
            ].join(" ")}
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="text-sm font-semibold">{alert.title}</div>
                    <div className={["mt-1 text-sm", selected ? "text-slate-600" : "text-slate-600"].join(" ")}>
                        {alert.message}
                    </div>
                </div>
                {!alert.readAt ? (
                    <span className={[
                        "h-2.5 w-2.5 rounded-full",
                        selected ? "bg-emerald-500" : "bg-sky-500",
                    ].join(" ")} />
                ) : null}
            </div>

            <div className={["mt-4 grid gap-2 text-xs", selected ? "text-slate-500" : "text-slate-500"].join(" ")}>
                <div>{alert.job.clientName}</div>
                <div>{alert.job.serviceName}</div>
                <div>{formatDateTime(alert.job.startAt)}</div>
                <div>Pre-assigned: {alert.job.workerName ?? "Unassigned"}</div>
            </div>
        </div>
    );
}

function DetailSkeleton() {
    return (
        <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
            <div className="space-y-3">
                <div className="h-6 w-48 animate-pulse rounded bg-slate-200" />
                <div className="h-4 w-80 animate-pulse rounded bg-slate-100" />
                <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
            </div>
        </div>
    );
}

function Details({
    detail,
    workerId,
    startValue,
    onWorkerIdChange,
    onStartValueChange,
    onSave,
    onConfirm,
    isSaving,
}: {
    detail: AlertDetail;
    workerId: string;
    startValue: string;
    onWorkerIdChange: (value: string) => void;
    onStartValueChange: (value: string) => void;
    onSave: () => void;
    onConfirm: () => void;
    isSaving: boolean;
}) {
    const latestPayment = detail.job.payments[0] ?? null;

    return (
        <div className="space-y-6 rounded-3xl border border-emerald-100/80 bg-[linear-gradient(180deg,#ffffff_0%,#f9fcff_100%)] p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <div className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-700">Booking review</div>
                    <h1 className="mt-2 text-2xl font-semibold text-slate-900">{detail.job.client.name}</h1>
                    <p className="mt-2 text-sm text-slate-600">{detail.message}</p>
                </div>

                <div className={["inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold", paymentTone(latestPayment?.status)].join(" ")}>
                    Payment {latestPayment?.status?.toLowerCase() ?? "pending"}
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-sky-100 bg-[linear-gradient(180deg,#f8fcff_0%,#f1f9ff_100%)] p-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-sky-700">Service</div>
                    <div className="mt-2 text-sm font-semibold text-slate-900">{detail.job.lineItems[0]?.description ?? "Service"}</div>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-[linear-gradient(180deg,#f7fcf9_0%,#eefbf4_100%)] p-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-emerald-700">Scheduled</div>
                    <div className="mt-2 text-sm font-semibold text-slate-900">{formatDateTime(detail.job.startAt)}</div>
                </div>
                <div className="rounded-2xl border border-sky-100 bg-[linear-gradient(180deg,#f8fcff_0%,#eef7ff_100%)] p-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-sky-700">Amount</div>
                    <div className="mt-2 text-sm font-semibold text-slate-900">{formatMoney(detail.job.totalCents, detail.job.currency)}</div>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-[linear-gradient(180deg,#f7fcf9_0%,#eefbf4_100%)] p-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-emerald-700">Receipt</div>
                    <div className="mt-2 text-sm font-semibold text-slate-900">
                        {latestPayment?.receiptUrl ? (
                            <a className="text-sky-700 underline" href={latestPayment.receiptUrl} target="_blank" rel="noreferrer">
                                Open receipt
                            </a>
                        ) : (
                            "Not available"
                        )}
                    </div>
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-4 rounded-2xl border border-sky-100 bg-white/90 p-4">
                    <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Customer</div>
                        <div className="mt-2 text-sm text-slate-700">{detail.job.client.name}</div>
                        <div className="text-sm text-slate-500">{detail.job.client.email ?? "No email"}</div>
                        <div className="text-sm text-slate-500">{detail.job.client.phone ?? "No phone"}</div>
                    </div>
                    <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Address</div>
                        <div className="mt-2 text-sm text-slate-700">{detail.job.client.address ?? detail.job.location ?? "No address provided"}</div>
                    </div>
                    <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Notes</div>
                        <div className="mt-2 text-sm text-slate-700">{detail.job.client.notes ?? "No notes"}</div>
                    </div>
                </div>

                <div className="space-y-4 rounded-2xl border border-emerald-100 bg-white/90 p-4">
                    <div>
                        <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Assigned worker</label>
                        <select
                            value={workerId}
                            onChange={(event) => onWorkerIdChange(event.target.value)}
                            className="mt-2 h-11 w-full rounded-xl border border-sky-100 bg-white px-3 text-sm text-slate-900 focus:border-emerald-300 focus:outline-none"
                        >
                            {detail.workers.map((worker) => (
                                <option key={worker.id} value={worker.id}>
                                    {worker.displayName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Scheduled time</label>
                        <input
                            type="datetime-local"
                            value={startValue}
                            onChange={(event) => onStartValueChange(event.target.value)}
                            className="mt-2 h-11 w-full rounded-xl border border-sky-100 bg-white px-3 text-sm text-slate-900 focus:border-emerald-300 focus:outline-none"
                        />
                        <div className="mt-2 text-xs text-slate-500">Changing time will be validated against the selected worker&apos;s schedule.</div>
                    </div>

                    <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                        <button
                            onClick={onSave}
                            disabled={isSaving}
                            className="inline-flex h-11 items-center justify-center rounded-xl border border-sky-100 bg-white px-4 text-sm font-medium text-slate-900 hover:border-sky-200 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Save changes
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isSaving}
                            className="inline-flex h-11 items-center justify-center rounded-xl border border-emerald-300 bg-[linear-gradient(135deg,#41be7f_0%,#5ea9f0_100%)] px-4 text-sm font-medium text-white hover:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Confirm booking
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function AlertsInboxPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const alertsQuery = useAlertsList("OPEN", true);
    const markRead = useMarkAlertRead();
    const reviewJob = useReviewJob();

    const selectedJobId = searchParams.get("jobId");
    const matchedAlertId =
        selectedJobId
            ? alertsQuery.data?.items.find((item) => item.job.id === selectedJobId)?.id
            : null;
    const selectedAlertId =
        searchParams.get("alertId") ?? matchedAlertId ?? alertsQuery.data?.items[0]?.id ?? "";
    const detailQuery = useAlertDetail(selectedAlertId, !!selectedAlertId);

    const [workerId, setWorkerId] = useState("");
    const [startValue, setStartValue] = useState("");

    useEffect(() => {
        const firstId = alertsQuery.data?.items[0]?.id;
        const nextAlertId = matchedAlertId ?? firstId;

        if (!searchParams.get("alertId") && nextAlertId) {
            const nextParams = new URLSearchParams(searchParams);
            nextParams.set("alertId", nextAlertId);
            nextParams.delete("jobId");
            setSearchParams(nextParams, { replace: true });
        }
    }, [alertsQuery.data?.items, matchedAlertId, searchParams, setSearchParams]);

    useEffect(() => {
        const detail = detailQuery.data;
        if (!detail) return;
        setWorkerId(detail.job.worker?.id ?? detail.workers[0]?.id ?? "");
        setStartValue(toDateTimeLocal(detail.job.startAt));
        if (!detail.readAt) markRead.mutate(detail.id);
    }, [detailQuery.data]);

    function handleError(error: unknown, fallback: string) {
        const anyError = error as { message?: string; response?: { data?: { message?: string } } };
        toast.error(anyError?.response?.data?.message ?? anyError?.message ?? fallback);
    }

    function runReview(confirm: boolean) {
        const detail = detailQuery.data;
        if (!detail) return;

        reviewJob.mutate(
            {
                jobId: detail.job.id,
                payload: {
                    alertId: detail.id,
                    workerId,
                    start: fromDateTimeLocal(startValue),
                    confirm,
                },
            },
            {
                onSuccess: async () => {
                    toast.success(confirm ? "Booking confirmed" : "Review changes saved");
                    await alertsQuery.refetch();
                    if (confirm) {
                        const nextAlertId = alertsQuery.data?.items.find((item) => item.id !== detail.id)?.id;
                        setSearchParams(nextAlertId ? { alertId: nextAlertId } : {}, { replace: true });
                    } else {
                        await detailQuery.refetch();
                    }
                },
                onError: (error) => handleError(error, confirm ? "Unable to confirm booking" : "Unable to save changes"),
            },
        );
    }

    return (
        <div className="mx-auto grid w-full max-w-7xl gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <section className="rounded-3xl border border-emerald-100/80 bg-[linear-gradient(180deg,#ffffff_0%,#f9fcff_100%)] p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <div className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-700">Alerts</div>
                        <h2 className="mt-2 text-xl font-semibold text-slate-900">Pending confirmations</h2>
                    </div>
                    <div className="rounded-full border border-emerald-300 bg-[linear-gradient(135deg,#41be7f_0%,#5ea9f0_100%)] px-3 py-1 text-xs font-semibold text-white">
                        {alertsQuery.data?.items.length ?? 0}
                    </div>
                </div>

                <div className="mt-5 space-y-3">
                    {alertsQuery.isLoading ? (
                        <div className="rounded-2xl border border-sky-100 bg-[linear-gradient(180deg,#f8fcff_0%,#f4fbf8_100%)] p-4 text-sm text-slate-500">Loading alerts...</div>
                    ) : alertsQuery.isError ? (
                        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Unable to load alerts.</div>
                    ) : alertsQuery.data?.items.length ? (
                        alertsQuery.data.items.map((alert) => (
                            <Link
                                key={alert.id}
                                to={`/app/new-bookings?alertId=${alert.id}`}
                                className="block"
                            >
                                <AlertRow alert={alert} selected={alert.id === selectedAlertId} />
                            </Link>
                        ))
                    ) : (
                        <div className="rounded-2xl border border-dashed border-sky-200 bg-[linear-gradient(180deg,#f8fcff_0%,#f4fbf8_100%)] p-8 text-center text-sm text-slate-500">
                            No pending booking alerts right now.
                        </div>
                    )}
                </div>
            </section>

            <section>
                {!selectedAlertId ? (
                    <div className="rounded-3xl border border-dashed border-sky-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
                        Select an alert to review the booking.
                    </div>
                ) : detailQuery.isLoading ? (
                    <DetailSkeleton />
                ) : detailQuery.isError || !detailQuery.data ? (
                    <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 shadow-sm">
                        Couldn&apos;t load the booking review details.
                    </div>
                ) : (
                    <Details
                        detail={detailQuery.data}
                        workerId={workerId}
                        startValue={startValue}
                        onWorkerIdChange={setWorkerId}
                        onStartValueChange={setStartValue}
                        onSave={() => runReview(false)}
                        onConfirm={() => runReview(true)}
                        isSaving={reviewJob.isPending || markRead.isPending}
                    />
                )}
            </section>
        </div>
    );
}
