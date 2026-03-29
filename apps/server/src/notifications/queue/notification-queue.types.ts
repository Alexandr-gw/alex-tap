import type { AsyncTraceLink } from '@/observability/observability.types';

export type EmailJobPayload = {
  companyId: string;
  notificationId: string;
  trace: AsyncTraceLink | null;
};

export type SmsJobPayload = {
  companyId: string;
  notificationId: string;
  trace: AsyncTraceLink | null;
};
