import { api } from '@/lib/api/apiClient';
import type {
    CreateJobCommentInput,
    JobDetailsDto,
    JobsListResponse,
    ListJobsParams,
    RequestJobPaymentInput,
    RequestJobPaymentResponse,
    UpdateInternalNotesInput,
    UpdateJobInput,
} from './jobs.types';

const JOBS_BASE = '/api/v1/jobs';

export function listJobs(params: ListJobsParams = {}) {
    const searchParams = new URLSearchParams();

    if (params.status) {
        searchParams.set('status', params.status);
    }

    if (params.from) {
        searchParams.set('from', params.from);
    }

    if (params.to) {
        searchParams.set('to', params.to);
    }

    if (params.take) {
        searchParams.set('take', String(params.take));
    }

    if (params.cursor) {
        searchParams.set('cursor', params.cursor);
    }

    const query = searchParams.toString();
    return api<JobsListResponse>(query ? `${JOBS_BASE}?${query}` : JOBS_BASE);
}

export function getJob(jobId: string) {
    return api<JobDetailsDto>(`${JOBS_BASE}/${jobId}`);
}

export function updateJob(jobId: string, input: UpdateJobInput) {
    return api<JobDetailsDto, UpdateJobInput>(`${JOBS_BASE}/${jobId}`, {
        method: 'PATCH',
        body: input,
    });
}

export function completeJob(jobId: string) {
    return api<JobDetailsDto, undefined>(`${JOBS_BASE}/${jobId}/complete`, {
        method: 'POST',
    });
}

export function cancelJob(jobId: string) {
    return api<JobDetailsDto, undefined>(`${JOBS_BASE}/${jobId}/cancel`, {
        method: 'POST',
    });
}

export function reopenJob(jobId: string) {
    return api<JobDetailsDto, undefined>(`${JOBS_BASE}/${jobId}/reopen`, {
        method: 'POST',
    });
}

export function createJobComment(jobId: string, input: CreateJobCommentInput) {
    return api<JobDetailsDto, CreateJobCommentInput>(`${JOBS_BASE}/${jobId}/comments`, {
        method: 'POST',
        body: input,
    });
}

export function updateInternalNotes(jobId: string, input: UpdateInternalNotesInput) {
    return api<JobDetailsDto, UpdateInternalNotesInput>(`${JOBS_BASE}/${jobId}/internal-notes`, {
        method: 'PATCH',
        body: input,
    });
}

export function requestJobPayment(jobId: string, input: RequestJobPaymentInput = {}) {
    return api<RequestJobPaymentResponse, RequestJobPaymentInput>(`${JOBS_BASE}/${jobId}/request-payment`, {
        method: 'POST',
        body: input,
    });
}

export function deleteJob(jobId: string) {
    return api<{ ok: true }>(`${JOBS_BASE}/${jobId}`, {
        method: 'DELETE',
    });
}
