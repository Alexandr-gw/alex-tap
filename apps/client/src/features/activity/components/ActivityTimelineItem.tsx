import type { ActivityItem } from "../api/activity.types";

type Props = {
    item: ActivityItem;
    isLast?: boolean;
};

function formatDateTime(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Invalid date";
    }

    return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(date);
}

function getFallbackMessage(item: ActivityItem) {
    const actor = item.actorLabel || "Someone";

    switch (item.type) {
        case "JOB_CREATED":
            return `${actor} created this job`;
        case "JOB_COMPLETED":
            return `${actor} completed this job`;
        case "JOB_CANCELED":
            return `${actor} canceled this job`;
        case "CLIENT_CREATED":
            return `${actor} created this client`;
        case "BOOKING_SUBMITTED":
            return `${actor} submitted a booking`;
        case "PAYMENT_SUCCEEDED":
            return `${actor} recorded a successful payment`;
        case "INVOICE_SENT":
            return `${actor} sent the invoice`;
        default:
            return `${actor} performed an activity`;
    }
}

function getDotClasses(type: ActivityItem["type"]) {
    switch (type) {
        case "JOB_COMPLETED":
        case "PAYMENT_SUCCEEDED":
            return "bg-green-500";
        case "JOB_CANCELED":
            return "bg-red-500";
        case "BOOKING_SUBMITTED":
        case "JOB_CREATED":
        case "CLIENT_CREATED":
        case "INVOICE_SENT":
        default:
            return "bg-blue-500";
    }
}

export function ActivityTimelineItem({ item, isLast = false }: Props) {
    const message = item.message?.trim() || getFallbackMessage(item);

    return (
        <div className="flex gap-3">
            <div className="flex flex-col items-center">
        <span
            className={[
                "mt-1 block h-2.5 w-2.5 rounded-full",
                getDotClasses(item.type),
            ].join(" ")}
        />
                {!isLast ? <span className="mt-2 w-px flex-1 bg-zinc-200" /> : null}
            </div>

            <div className="min-w-0 flex-1 pb-5">
                <p className="text-sm font-medium text-zinc-900">{message}</p>
                <p className="mt-1 text-xs text-zinc-500">{formatDateTime(item.createdAt)}</p>
            </div>
        </div>
    );
}