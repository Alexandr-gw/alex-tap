import type { JobNotificationsSummary } from "../api/notifications.types";

type NotificationHint = {
    tone: "warning" | "info";
    label: string;
    title: string;
};

export function getJobNotificationHint(
    summary: JobNotificationsSummary,
): NotificationHint | null {
    if (summary.blockedReason) {
        return {
            tone: "warning",
            label: "Email issue",
            title: summary.blockedReason,
        };
    }

    if (summary.confirmation.status === "FAILED") {
        return {
            tone: "warning",
            label: "Email failed",
            title:
                summary.confirmation.errorMessage ||
                "Confirmation email delivery failed.",
        };
    }

    const failedReminder = summary.reminders.find(
        (reminder) => reminder.status === "FAILED",
    );

    if (failedReminder) {
        return {
            tone: "warning",
            label: "Reminder failed",
            title:
                failedReminder.errorMessage ||
                `${failedReminder.type} delivery failed.`,
        };
    }

    if (!summary.clientEmail) {
        return null;
    }

    return {
        tone: "info",
        label: "Email ready",
        title: `Notifications available for ${summary.clientEmail}`,
    };
}
