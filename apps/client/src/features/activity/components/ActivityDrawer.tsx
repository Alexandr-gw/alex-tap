import { useEffect } from "react";
import { Bell, CalendarClock, CheckCircle2, Sparkles, X } from "lucide-react";
import type { ActivityItem } from "../api/activity.types";

type Props = {
    open: boolean;
    items: ActivityItem[];
    isLoading?: boolean;
    onClose: () => void;
};

export function ActivityDrawer({ open, items, isLoading = false, onClose }: Props) {
    useEffect(() => {
        if (!open) {
            return;
        }

        const previousOverflow = document.body.style.overflow;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [open, onClose]);

    if (!open) {
        return null;
    }

        return (
        <div className="fixed inset-0 z-[70]">
            <button
                type="button"
                aria-label="Close activity panel"
                className="absolute inset-0 bg-transparent"
                onClick={onClose}
            />

            <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl">
                <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
                        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600">
                            <Bell className="h-3.5 w-3.5" />
                            Activity feed
                        </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-5">
                    {isLoading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 4 }).map((_, index) => (
                                <div key={index} className="animate-pulse rounded-3xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="h-3 w-24 rounded bg-slate-200" />
                                    <div className="mt-3 h-4 w-4/5 rounded bg-slate-200" />
                                    <div className="mt-2 h-3 w-2/5 rounded bg-slate-200" />
                                </div>
                            ))}
                        </div>
                    ) : items.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 px-6 text-center">
                            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-slate-500 shadow-sm">
                                <CalendarClock className="h-6 w-6" />
                            </div>
                            <h3 className="mt-5 text-base font-semibold text-slate-900">No fresh activity yet</h3>
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                New bookings, job creation, and successful payments from the last day will show up here.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {items.map((item) => {
                                const tone = getActivityTone(item.type);

                                return (
                                    <article
                                        key={item.id}
                                        className={[
                                            "rounded-3xl border p-4 shadow-sm transition",
                                            tone.containerClass,
                                        ].join(" ")}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={["grid h-11 w-11 flex-none place-items-center rounded-2xl", tone.iconClass].join(" ")}>
                                                {tone.icon}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className={["inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]", tone.badgeClass].join(" ")}>
                                                        {tone.label}
                                                    </span>
                                                    <span className="text-xs text-slate-500">{formatDate(item.createdAt)}</span>
                                                </div>

                                                <p className="mt-3 text-sm font-medium leading-6 text-slate-900">
                                                    {item.message?.trim() || getFallbackMessage(item)}
                                                </p>

                                                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                                                    {item.actorLabel ? (
                                                        <span className="rounded-full bg-white/70 px-2.5 py-1">
                                                            {item.actorLabel}
                                                        </span>
                                                    ) : null}
                                                    {item.jobId ? (
                                                        <span className="rounded-full bg-white/70 px-2.5 py-1">
                                                            Job {item.jobId.slice(0, 8)}
                                                        </span>
                                                    ) : null}
                                                    {item.clientId ? (
                                                        <span className="rounded-full bg-white/70 px-2.5 py-1">
                                                            Client {item.clientId.slice(0, 8)}
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </div>
            </aside>
        </div>
    );
}

function getFallbackMessage(item: ActivityItem) {
    const actor = item.actorLabel || "Someone";

    switch (item.type) {
        case "JOB_CREATED":
            return `${actor} created a job`;
        case "JOB_COMPLETED":
            return `${actor} completed a job`;
        case "JOB_CANCELED":
            return `${actor} canceled a job`;
        case "CLIENT_CREATED":
            return `${actor} created a client`;
        case "BOOKING_SUBMITTED":
            return `${actor} submitted a booking`;
        case "PAYMENT_SUCCEEDED":
            return `${actor} recorded a successful payment`;
        case "INVOICE_SENT":
            return `${actor} sent an invoice`;
        default:
            return `${actor} performed an activity`;
    }
}

function formatDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "Unknown time";
    }

    return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(date);
}

function getActivityTone(type: ActivityItem["type"]) {
    switch (type) {
        case "BOOKING_SUBMITTED":
            return {
                label: "New booking",
                containerClass: "border-fuchsia-200/80 bg-gradient-to-r from-fuchsia-50 via-violet-50 to-sky-50",
                iconClass: "bg-gradient-to-br from-fuchsia-500 via-violet-500 to-sky-500 text-white shadow-lg shadow-fuchsia-200/70",
                badgeClass: "bg-white/80 text-fuchsia-700",
                icon: <Sparkles className="h-5 w-5" />
            };
        case "JOB_CREATED":
            return {
                label: "Job created",
                containerClass: "border-emerald-200 bg-emerald-50/90",
                iconClass: "bg-emerald-500 text-white shadow-lg shadow-emerald-200/70",
                badgeClass: "bg-white/80 text-emerald-700",
                icon: <CheckCircle2 className="h-5 w-5" />
            };
        case "PAYMENT_SUCCEEDED":
        case "INVOICE_SENT":
            return {
                label: type === "PAYMENT_SUCCEEDED" ? "Invoice paid" : "Invoice sent",
                containerClass: "border-amber-200 bg-amber-50/90",
                iconClass: "bg-amber-400 text-amber-950 shadow-lg shadow-amber-200/80",
                badgeClass: "bg-white/80 text-amber-800",
                icon: <CalendarClock className="h-5 w-5" />
            };
        case "JOB_COMPLETED":
            return {
                label: "Job completed",
                containerClass: "border-sky-200 bg-sky-50/90",
                iconClass: "bg-sky-500 text-white shadow-lg shadow-sky-200/80",
                badgeClass: "bg-white/80 text-sky-700",
                icon: <CheckCircle2 className="h-5 w-5" />
            };
        default:
            return {
                label: "Activity",
                containerClass: "border-slate-200 bg-slate-50/90",
                iconClass: "bg-slate-700 text-white shadow-lg shadow-slate-200/80",
                badgeClass: "bg-white/80 text-slate-700",
                icon: <Bell className="h-5 w-5" />
            };
    }
}
