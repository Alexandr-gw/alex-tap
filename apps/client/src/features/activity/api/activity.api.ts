import { api } from '@/lib/api/apiClient';
import type { JobActivityResponse, RecentActivityResponse } from './activity.types';

export function getJobActivity(jobId: string): Promise<JobActivityResponse> {
    return api<JobActivityResponse>(`/api/v1/jobs/${jobId}/activity`);
}

export function getRecentActivity(hours = 24, limit = 100): Promise<RecentActivityResponse> {
    const searchParams = new URLSearchParams({
        hours: String(hours),
        limit: String(limit)
    });

    return api<RecentActivityResponse>(`/api/v1/activity/recent?${searchParams.toString()}`);
}
