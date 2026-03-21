import type {
    NotificationDeliveryStatus,
    ReminderType,
} from "../api/notifications.types";

type Props = {
    label: string;
    status: NotificationDeliveryStatus;
    secondaryText?: string | null;
    errorMessage?: string | null;
    reminderType?: ReminderType;
};

function getStatusClasses(status: NotificationDeliveryStatus) {
    switch (status) {
        case "SENT":
            return "bg-green-100 text-green-700 border-green-200";
        case "SCHEDULED":
            return "bg-blue-100 text-blue-700 border-blue-200";
        case "FAILED":
            return "bg-red-100 text-red-700 border-red-200";
        case "CANCELED":
            return "bg-zinc-100 text-zinc-600 border-zinc-200";
        case "NOT_SENT":
            return "bg-amber-100 text-amber-700 border-amber-200";
        case "NOT_APPLICABLE":
        default:
            return "bg-zinc-100 text-zinc-600 border-zinc-200";
    }
}

function getStatusLabel(status: NotificationDeliveryStatus) {
    switch (status) {
        case "SENT":
            return "Sent";
        case "SCHEDULED":
            return "Scheduled";
        case "FAILED":
            return "Failed";
        case "CANCELED":
            return "Canceled";
        case "NOT_SENT":
            return "Not sent";
        case "NOT_APPLICABLE":
        default:
            return "Not applicable";
    }
}

export function NotificationStatusRow({
                                          label,
                                          status,
                                          secondaryText,
                                          errorMessage,
                                      }: Props) {
    return (
        <div className="rounded-xl border border-zinc-200 bg-white p-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900">{label}</p>

                    {secondaryText ? (
                        <p className="mt-1 text-xs text-zinc-500">{secondaryText}</p>
                    ) : null}

                    {status === "FAILED" && errorMessage ? (
                        <p className="mt-1 text-xs text-red-600">{errorMessage}</p>
                    ) : null}
                </div>

                <span
                    className={[
                        "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium",
                        getStatusClasses(status),
                    ].join(" ")}
                >
          {getStatusLabel(status)}
        </span>
            </div>
        </div>
    );
}