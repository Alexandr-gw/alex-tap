import { Link } from 'react-router-dom';
import { useCompleteJob } from '../hooks/jobs.queries';
import type { JobDetailsDto } from '../api/jobs.types';

type Props = {
    job: JobDetailsDto;
    onEdit: () => void;
    onClose?: () => void;
};

function formatDateTime(value?: string | null) {
    if (!value) return '-';
    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(new Date(value));
}

export function JobPreviewCard({ job, onEdit, onClose }: Props) {
    const firstVisit = job.visits[0];
    const completeMutation = useCompleteJob(job.id);
    const isPendingReview = job.status === 'PENDING_CONFIRMATION';
    const canComplete = !job.completed && job.status !== 'CANCELED' && !isPendingReview;

    async function handleComplete() {
        await completeMutation.mutateAsync();
        onClose?.();
    }

    return (
        <div className="w-[420px] rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-200 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Job #{job.jobNumber}
                        </p>
                        <h3 className="mt-1 text-lg font-semibold text-slate-900">
                            {job.title}
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                            {job.client?.name ?? 'No client'}
                        </p>
                    </div>

                    <span
                        className={[
                            'rounded-full px-2.5 py-1 text-xs font-medium',
                            job.completed
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-100 text-slate-700',
                        ].join(' ')}
                    >
                        {job.completed ? 'Completed' : job.status}
                    </span>
                </div>
            </div>

            <div className="space-y-4 px-4 py-4 text-sm">
                <div>
                    <p className="font-medium text-slate-900">Details</p>
                    <p className="mt-1 text-slate-600">
                        {job.description?.trim() || 'No description'}
                    </p>
                </div>

                <div>
                    <p className="font-medium text-slate-900">Scheduled</p>
                    <p className="mt-1 text-slate-600">
                        {firstVisit ? formatDateTime(firstVisit.start) : 'No visit scheduled'}
                    </p>
                </div>

                <div>
                    <p className="font-medium text-slate-900">Team</p>
                    <p className="mt-1 text-slate-600">
                        {job.workers.length
                            ? job.workers.map((w) => w.name).join(', ')
                            : 'Unassigned'}
                    </p>
                </div>

                <div>
                    <p className="font-medium text-slate-900">Location</p>
                    <p className="mt-1 text-slate-600">{job.client?.address ?? job.location ?? '-'}</p>
                </div>

                <div>
                    <p className="font-medium text-slate-900">Line items</p>
                    <p className="mt-1 text-slate-600">
                        {job.lineItems.length
                            ? `${job.lineItems.length} item(s)`
                            : 'No line items listed'}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3 border-t border-slate-200 p-4 sm:grid-cols-3">
                {canComplete ? (
                    <button
                        type="button"
                        onClick={handleComplete}
                        disabled={completeMutation.isPending}
                        className="rounded-xl bg-emerald-600 px-4 py-2.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                        {completeMutation.isPending ? 'Completing...' : 'Complete'}
                    </button>
                ) : isPendingReview ? (
                    <Link
                        to={`/app/new-bookings?jobId=${job.id}`}
                        onClick={onClose}
                        className="rounded-xl bg-slate-900 px-4 py-2.5 text-center font-medium text-white hover:bg-slate-800"
                    >
                        Review booking
                    </Link>
                ) : null}

                <button
                    type="button"
                    onClick={onEdit}
                    className="rounded-xl border border-slate-300 px-4 py-2.5 font-medium text-slate-800 hover:bg-slate-50"
                >
                    Edit
                </button>

                <Link
                    to={`/app/jobs/${job.id}`}
                    onClick={onClose}
                    className="rounded-xl bg-slate-900 px-4 py-2.5 text-center font-medium text-white hover:bg-slate-800"
                >
                    View details
                </Link>
            </div>
        </div>
    );
}
