import { api } from '@/lib/api/apiClient';
import type { JobActivityResponse } from './activity.types';

export function getJobActivity(jobId: string): Promise<JobActivityResponse> {
    return api<JobActivityResponse>(`/api/v1/jobs/${jobId}/activity`);
}
