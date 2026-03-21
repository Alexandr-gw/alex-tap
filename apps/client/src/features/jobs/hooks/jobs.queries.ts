import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    cancelJob,
    completeJob,
    createJobComment,
    getJob,
    reopenJob,
    requestJobPayment,
    updateInternalNotes,
    updateJob,
} from '../api/jobs.api';
import type {
    CreateJobCommentInput,
    JobCommentDto,
    JobDetailsDto,
    RequestJobPaymentInput,
    UpdateInternalNotesInput,
    UpdateJobInput,
} from '../api/jobs.types';
import { activityQueryKeys } from '@/features/activity/hooks/activity.queries';
import { notificationQueryKeys } from '@/features/notifications/hooks/notifications.queries';

export function useJob(jobId: string | undefined) {
    return useQuery({
        queryKey: ['job', jobId],
        queryFn: () => getJob(jobId!),
        enabled: Boolean(jobId),
    });
}

export function useUpdateJob(jobId: string) {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (input: UpdateJobInput) => updateJob(jobId, input),
        onSuccess: (data) => {
            qc.setQueryData(['job', jobId], data);
            qc.invalidateQueries({ queryKey: ['jobs'] });
        },
    });
}

export function useCompleteJob(jobId: string) {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: () => completeJob(jobId),
        onMutate: async () => {
            await qc.cancelQueries({ queryKey: ['job', jobId] });

            const previous = qc.getQueryData<JobDetailsDto>(['job', jobId]);

            if (previous) {
                qc.setQueryData<JobDetailsDto>(['job', jobId], {
                    ...previous,
                    completed: true,
                    status: 'DONE',
                });
            }

            return { previous };
        },
        onError: (_err, _vars, ctx) => {
            if (ctx?.previous) {
                qc.setQueryData(['job', jobId], ctx.previous);
            }
        },
        onSuccess: (data) => {
            qc.setQueryData(['job', jobId], data);
            qc.invalidateQueries({ queryKey: ['jobs'] });
            qc.invalidateQueries({ queryKey: activityQueryKeys.job(jobId) });
            qc.invalidateQueries({ queryKey: notificationQueryKeys.job(jobId) });
        },
    });
}

export function useCancelJob(jobId: string) {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: () => cancelJob(jobId),
        onSuccess: (data) => {
            qc.setQueryData(['job', jobId], data);
            qc.invalidateQueries({ queryKey: ['jobs'] });
            qc.invalidateQueries({ queryKey: activityQueryKeys.job(jobId) });
            qc.invalidateQueries({ queryKey: notificationQueryKeys.job(jobId) });
        },
    });
}

export function useReopenJob(jobId: string) {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: () => reopenJob(jobId),
        onSuccess: (data) => {
            qc.setQueryData(['job', jobId], data);
            qc.invalidateQueries({ queryKey: ['jobs'] });
            qc.invalidateQueries({ queryKey: notificationQueryKeys.job(jobId) });
        },
    });
}

export function useCreateJobComment(jobId: string) {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (input: CreateJobCommentInput) => createJobComment(jobId, input),
        onMutate: async (input) => {
            await qc.cancelQueries({ queryKey: ['job', jobId] });

            const previous = qc.getQueryData<JobDetailsDto>(['job', jobId]);

            if (previous) {
                const optimisticComment: JobCommentDto = {
                    id: `temp-${Date.now()}`,
                    body: input.body,
                    authorName: 'You',
                    createdAt: new Date().toISOString(),
                };

                qc.setQueryData<JobDetailsDto>(['job', jobId], {
                    ...previous,
                    comments: [...previous.comments, optimisticComment],
                });
            }

            return { previous };
        },
        onError: (_err, _vars, ctx) => {
            if (ctx?.previous) {
                qc.setQueryData(['job', jobId], ctx.previous);
            }
        },
        onSuccess: (data) => {
            qc.setQueryData(['job', jobId], data);
        },
    });
}

export function useUpdateInternalNotes(jobId: string) {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (input: UpdateInternalNotesInput) => updateInternalNotes(jobId, input),
        onSuccess: (data) => {
            qc.setQueryData(['job', jobId], data);
        },
    });
}

export function useRequestJobPayment(jobId: string) {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (input: RequestJobPaymentInput = {}) => requestJobPayment(jobId, input),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['job', jobId] });
        },
    });
}
