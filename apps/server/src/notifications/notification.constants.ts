export const QUEUE_EMAIL = 'reminders-email';
export const QUEUE_SMS = 'reminders-sms';
export const QUEUE_EMAIL_DLQ = 'reminders-email-dlq';
export const QUEUE_SMS_DLQ = 'reminders-sms-dlq';

// Notification "type" values (matches your Notification.type string field)
export const TYPE_JOB_REMINDER_24H = 'job_reminder_24h';
export const TYPE_JOB_REMINDER_2H  = 'job_reminder_2h';

export const MAX_ATTEMPTS = 5; // BullMQ attempts
