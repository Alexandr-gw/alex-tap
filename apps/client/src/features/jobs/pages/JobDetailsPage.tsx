import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ui/useConfirm';
import { isApiError } from '@/lib/api/apiError';
import { JobCommentsCard } from '../components/JobCommentsCard';
import { JobHeaderCard } from '../components/JobHeaderCard';
import { JobInvoicesCard } from '../components/JobInvoicesCard';
import { JobLineItemsCard } from '../components/JobLineItemsCard';
import { JobStatusActions } from '../components/JobStatusActions';
import { JobVisitsCard } from '../components/JobVisitsCard';
import { useDeleteJob, useJob } from '../hooks/jobs.queries';
import { JobNotificationsCard } from '@/features/notifications/components/JobNotificationsCard';
import { JobActivityCard } from '@/features/activity/components/JobActivityCard';

export function JobDetailsPage() {
    const { jobId } = useParams<{ jobId: string }>();
    const navigate = useNavigate();
    const { confirm, ConfirmUI } = useConfirm();
    const query = useJob(jobId);
    const deleteMutation = useDeleteJob(jobId ?? '');

    if (query.isLoading) {
        return (
            <div className="space-y-4">
                <div className="h-40 animate-pulse rounded-3xl bg-slate-200" />
                <div className="h-72 animate-pulse rounded-3xl bg-slate-200" />
                <div className="h-72 animate-pulse rounded-3xl bg-slate-200" />
            </div>
        );
    }

    if (query.isError || !query.data) {
        return (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
                Failed to load job details
            </div>
        );
    }

    const job = query.data;

    async function handleDelete() {
        const confirmed = await confirm({
            title: 'Delete job?',
            description: 'This removes the job from active schedules and job lists.',
            confirmText: 'Delete job',
            cancelText: 'Keep job',
            danger: true,
        });

        if (!confirmed || !jobId) {
            return;
        }

        try {
            await deleteMutation.mutateAsync();
            toast.success('Job deleted.');
            navigate('/app/jobs');
        } catch (error) {
            const message = isApiError(error)
                ? error.message
                : error instanceof Error
                    ? error.message
                    : 'Unable to delete job.';
            toast.error(message);
        }
    }

    return (
        <>
            <div className="space-y-6">
                <JobHeaderCard job={job} />
                <JobStatusActions job={job} />
                <JobNotificationsCard
                    jobId={job.id}
                    onSendSuccess={() => {
                        toast.success('Confirmation email sent.');
                    }}
                    onSendError={(error) => {
                        const message = isApiError(error)
                            ? error.message
                            : error instanceof Error
                                ? error.message
                                : 'Unable to send confirmation email.';
                        toast.error(message);
                    }}
                />
                <JobActivityCard jobId={job.id} />
                <JobLineItemsCard job={job} />
                <JobVisitsCard job={job} />
                <JobInvoicesCard job={job} />
                <JobCommentsCard job={job} />
                <section className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-900">
                    <h2 className="text-lg font-semibold">Delete job</h2>
                    <p className="mt-2 text-sm text-red-700">
                        This removes the job from active schedules, slot blocking, and job lists.
                    </p>
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={deleteMutation.isPending}
                        className="mt-4 rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {deleteMutation.isPending ? 'Deleting...' : 'Delete job'}
                    </button>
                </section>
            </div>
            {ConfirmUI}
        </>
    );
}


