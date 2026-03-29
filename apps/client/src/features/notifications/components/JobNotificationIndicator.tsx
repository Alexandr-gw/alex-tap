import { Mail, TriangleAlert } from "lucide-react";
import { useJobNotifications } from "../hooks/notifications.queries";
import { getJobNotificationHint } from "../utils/notificationSummary";

type Props = {
    jobId: string;
    showHealthy?: boolean;
    className?: string;
};

export function JobNotificationIndicator({
    jobId,
    showHealthy = false,
    className = "",
}: Props) {
    const query = useJobNotifications(jobId);

    if (query.isLoading || query.isError || !query.data) {
        return null;
    }

    const hint = getJobNotificationHint(query.data);
    if (!hint) {
        return null;
    }

    if (hint.tone === "info" && !showHealthy) {
        return null;
    }

    const isWarning = hint.tone === "warning";
    const Icon = isWarning ? TriangleAlert : Mail;

    return (
        <span
            title={hint.title}
            className={[
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                isWarning
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : "border-sky-200 bg-sky-50 text-sky-700",
                className,
            ].join(" ")}
        >
            <Icon className="h-3 w-3" />
            <span>{hint.label}</span>
        </span>
    );
}
