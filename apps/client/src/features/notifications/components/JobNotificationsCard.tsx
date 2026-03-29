import { useMemo } from 'react';
import { NotificationStatusRow } from './NotificationStatusRow';
import { SendConfirmationButton } from './SendConfirmationButton';
import { useJobNotifications } from '../hooks/notifications.queries';
import type { ReminderSummary } from '../api/notifications.types';

type Props = {
    jobId: string;
    onSendSuccess?: () => void;
    onSendError?: (error: unknown) => void;
};

function formatDateTime(value: string | null | undefined) {
    if (!value) return null;

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return null;

    return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
}

function getReminderLabel(type: ReminderSummary['type']) {
    switch (type) {
        case 'REMINDER_24H':
            return '24h reminder';
        case 'REMINDER_1H':
            return '1h reminder';
        default:
            return type;
    }
}

export function JobNotificationsCard({
    jobId,
    onSendSuccess,
    onSendError,
}: Props) {
    const { data, isLoading, isError, error } = useJobNotifications(jobId);

    const reminderRows = useMemo(() => {
        if (!data) return [];

        return [...data.reminders].sort((a, b) => {
            const order = {
                REMINDER_24H: 1,
                REMINDER_1H: 2,
            } as const;

            return order[a.type] - order[b.type];
        });
    }, [data]);

    if (isLoading) {
        return (
            <section className="rounded-2xl border border-zinc-200 bg-white p-4">
                <div className="animate-pulse space-y-3">
                    <div className="h-5 w-40 rounded bg-zinc-200" />
                    <div className="h-4 w-56 rounded bg-zinc-200" />
                    <div className="h-16 rounded-xl bg-zinc-100" />
                    <div className="h-16 rounded-xl bg-zinc-100" />
                    <div className="h-10 w-40 rounded bg-zinc-200" />
                </div>
            </section>
        );
    }

    if (isError || !data) {
        return (
            <section className="rounded-2xl border border-red-200 bg-white p-4">
                <h3 className="text-base font-semibold text-zinc-900">Notifications</h3>
                <p className="mt-2 text-sm text-red-600">
                    Failed to load notification status.
                </p>
                {error instanceof Error ? (
                    <p className="mt-1 text-xs text-zinc-500">{error.message}</p>
                ) : null}
            </section>
        );
    }

    const confirmationSecondaryText =
        data.confirmation.status === 'SENT'
            ? `Last sent ${formatDateTime(data.confirmation.lastSentAt) ?? 'recently'}`
            : data.confirmation.status === 'FAILED'
                ? 'Delivery failed'
                : 'No confirmation email sent yet';

    const blockedReasonText = data.blockedReason
        ? data.blockedReason
        : !data.clientEmail
            ? 'No client email available. Email notifications are unavailable.'
            : null;

    const sendDisabled = !data.clientEmail || Boolean(data.blockedReason);

    return (
        <section className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-base font-semibold text-zinc-900">Notifications</h3>
                    <p className="mt-1 text-sm text-zinc-500">
                        Client email: {data.clientEmail ?? '-'}
                    </p>
                </div>

                <SendConfirmationButton
                    jobId={jobId}
                    disabled={sendDisabled}
                    confirmation={data.confirmation}
                    onSuccess={onSendSuccess}
                    onError={onSendError}
                />
            </div>

            {blockedReasonText ? (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <p className="text-sm text-amber-800">{blockedReasonText}</p>
                </div>
            ) : null}

            <div className="mt-4 space-y-3">
                <NotificationStatusRow
                    label="Confirmation email"
                    status={data.confirmation.status}
                    secondaryText={confirmationSecondaryText}
                    errorMessage={data.confirmation.errorMessage}
                />

                {reminderRows.map((reminder) => {
                    const secondaryText =
                        reminder.status === 'SCHEDULED'
                            ? `Scheduled for ${formatDateTime(reminder.scheduledFor) ?? '-'}`
                            : reminder.status === 'SENT'
                                ? `Sent ${formatDateTime(reminder.sentAt) ?? '-'}`
                                : reminder.status === 'FAILED'
                                    ? 'Delivery failed'
                                    : reminder.status === 'CANCELED'
                                        ? 'Reminder was canceled'
                                        : 'Not applicable';

                    return (
                        <NotificationStatusRow
                            key={reminder.type}
                            label={getReminderLabel(reminder.type)}
                            status={reminder.status}
                            secondaryText={secondaryText}
                            errorMessage={reminder.errorMessage}
                        />
                    );
                })}
            </div>
        </section>
    );
}

