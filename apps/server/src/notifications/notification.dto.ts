export type EnqueueJobReminderInput = {
  companyId: string;
  jobId: string;
};

export type JobNotificationDto = {
  id: string;
  type: string;
  channel: string;
  status: string;
  scheduledAt: string | null;
  sentAt: string | null;
  recipient: string | null;
  providerMessageId: string | null;
  errorMessage: string | null;
};

export type NotificationDeliveryStatus =
  | 'NOT_SENT'
  | 'SCHEDULED'
  | 'SENT'
  | 'FAILED'
  | 'CANCELED'
  | 'NOT_APPLICABLE';

export type ReminderType = 'REMINDER_24H' | 'REMINDER_1H';

export type ConfirmationSummaryDto = {
  status: Extract<NotificationDeliveryStatus, 'NOT_SENT' | 'SENT' | 'FAILED'>;
  lastSentAt: string | null;
  errorMessage: string | null;
};

export type ReminderSummaryDto = {
  type: ReminderType;
  status: Extract<
    NotificationDeliveryStatus,
    'SCHEDULED' | 'SENT' | 'FAILED' | 'CANCELED' | 'NOT_APPLICABLE'
  >;
  scheduledFor: string | null;
  sentAt: string | null;
  errorMessage: string | null;
};

export type JobNotificationsSummaryDto = {
  jobId: string;
  clientEmail: string | null;
  blockedReason: string | null;
  confirmation: ConfirmationSummaryDto;
  reminders: ReminderSummaryDto[];
};

export type SendJobConfirmationResponseDto = {
  success: boolean;
  message?: string;
  confirmation: ConfirmationSummaryDto;
};

export type ClientLastCommunicationDto = {
  channel: 'EMAIL';
  type: 'CONFIRMATION' | 'REMINDER_24H' | 'REMINDER_1H';
  label: string;
  sentAt: string;
  recipient: string | null;
  jobId: string;
};

