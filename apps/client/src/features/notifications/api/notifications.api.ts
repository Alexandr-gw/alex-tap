import { api } from '@/lib/api/apiClient';
import type {
    JobNotificationsSummary,
    SendConfirmationResponse,
} from './notifications.types';

export function getJobNotifications(
    jobId: string,
): Promise<JobNotificationsSummary> {
    return api<JobNotificationsSummary>(`/api/v1/jobs/${jobId}/notifications`);
}

export function sendJobConfirmationEmail(
    jobId: string,
): Promise<SendConfirmationResponse> {
    return api<SendConfirmationResponse>(
        `/api/v1/jobs/${jobId}/notifications/send-confirmation`,
        {
            method: 'POST',
        },
    );
}

