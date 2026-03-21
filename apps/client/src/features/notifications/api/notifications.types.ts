export type NotificationDeliveryStatus =
    | "NOT_SENT"
    | "SCHEDULED"
    | "SENT"
    | "FAILED"
    | "CANCELED"
    | "NOT_APPLICABLE";

export type ReminderType = "REMINDER_24H" | "REMINDER_1H";

export type ConfirmationSummary = {
    status: Extract<NotificationDeliveryStatus, "NOT_SENT" | "SENT" | "FAILED">;
    lastSentAt: string | null;
    errorMessage: string | null;
};

export type ReminderSummary = {
    type: ReminderType;
    status: Extract<
        NotificationDeliveryStatus,
        "SCHEDULED" | "SENT" | "FAILED" | "CANCELED" | "NOT_APPLICABLE"
    >;
    scheduledFor: string | null;
    sentAt: string | null;
    errorMessage: string | null;
};

export type JobNotificationsSummary = {
    jobId: string;
    clientEmail: string | null;
    blockedReason: string | null;
    confirmation: ConfirmationSummary;
    reminders: ReminderSummary[];
};

export type SendConfirmationResponse = {
    success: boolean;
    message?: string;
    confirmation: ConfirmationSummary;
};