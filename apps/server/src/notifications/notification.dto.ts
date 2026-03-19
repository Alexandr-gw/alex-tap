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
