import type { JobDetailsDto } from '../api/jobs.types';

type Props = {
    job: JobDetailsDto;
};

export function JobHeaderCard({ job }: Props) {
    return (
        <section className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 lg:grid-cols-[1.4fr_1fr]">
            <div>
                <p className="text-sm text-slate-500">Job #{job.jobNumber}</p>
                <h1 className="mt-1 text-3xl font-semibold text-slate-900">{job.title}</h1>
                <p className="mt-3 text-slate-600">
                    {job.description?.trim() || 'No description'}
                </p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div>
                        <p className="text-sm font-medium text-slate-500">Client</p>
                        <p className="mt-1 text-base font-medium text-slate-900">
                            {job.client?.name ?? '-'}
                        </p>
                        <p className="text-slate-600">{job.client?.phone ?? '-'}</p>
                        <p className="text-slate-600">{job.client?.email ?? '-'}</p>
                    </div>

                    <div>
                        <p className="text-sm font-medium text-slate-500">Property address</p>
                        <p className="mt-1 text-slate-900">{job.client?.address ?? job.location ?? '-'}</p>
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
                <h2 className="text-lg font-semibold text-slate-900">Job details</h2>

                <dl className="mt-4 divide-y divide-slate-200 text-sm">
                    <div className="flex justify-between gap-4 py-3">
                        <dt className="text-slate-500">Status</dt>
                        <dd className="font-medium text-slate-900">{job.status}</dd>
                    </div>
                    <div className="flex justify-between gap-4 py-3">
                        <dt className="text-slate-500">Completed</dt>
                        <dd className="font-medium text-slate-900">
                            {job.completed ? 'Yes' : 'No'}
                        </dd>
                    </div>
                    <div className="flex justify-between gap-4 py-3">
                        <dt className="text-slate-500">Assigned team</dt>
                        <dd className="font-medium text-slate-900">
                            {job.workers.length
                                ? job.workers.map((w) => w.name).join(', ')
                                : 'Unassigned'}
                        </dd>
                    </div>
                    <div className="flex justify-between gap-4 py-3">
                        <dt className="text-slate-500">Scheduled</dt>
                        <dd className="font-medium text-slate-900">
                            {new Intl.DateTimeFormat(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                            }).format(new Date(job.startAt))}
                        </dd>
                    </div>
                </dl>
            </div>
        </section>
    );
}
