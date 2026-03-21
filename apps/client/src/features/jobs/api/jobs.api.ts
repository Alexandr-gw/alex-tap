import { api } from '@/lib/api/apiClient';
import type {
    CreateJobCommentInput,
    JobDetailsDto,
    RequestJobPaymentInput,
    RequestJobPaymentResponse,
    UpdateInternalNotesInput,
    UpdateJobInput,
} from './jobs.types';

const JOBS_BASE = '/api/v1/jobs';

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
