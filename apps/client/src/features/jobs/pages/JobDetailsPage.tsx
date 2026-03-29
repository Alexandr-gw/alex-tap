import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { isApiError } from '@/lib/api/apiError';
import { JobCommentsCard } from '../components/JobCommentsCard';
import { JobHeaderCard } from '../components/JobHeaderCard';
import { JobInvoicesCard } from '../components/JobInvoicesCard';
import { JobLineItemsCard } from '../components/JobLineItemsCard';
import { JobStatusActions } from '../components/JobStatusActions';
import { JobVisitsCard } from '../components/JobVisitsCard';
import { useJob } from '../hooks/jobs.queries';
import { JobNotificationsCard } from '@/features/notifications/components/JobNotificationsCard';
import { JobActivityCard } from '@/features/activity/components/JobActivityCard';

export function JobDetailsPage() {
    const { jobId } = useParams<{ jobId: string }>();
    const query = useJob(jobId);

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

    return (
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
        </div>
    );
}



