import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getWorkers } from '@/features/schedule/api/schedule.api';
import { isApiError } from '@/lib/api/apiError';
import { JobNotificationsCard } from '@/features/notifications/components/JobNotificationsCard';
import { JobWorkerPicker } from './JobWorkerPicker';
import type { JobDetailsDto } from '../api/jobs.types';
import { useUpdateJob } from '../hooks/jobs.queries';

type Props = {
    job: JobDetailsDto | null;
    open: boolean;
    onClose: () => void;
};

type LineItemForm = {
    id?: string;
    name: string;
    quantity: number;
    unitPriceCents: number;
};

function centsToDollars(cents: number) {
    return (cents / 100).toFixed(2);
}

export function EditJobDialog({ job, open, onClose }: Props) {
    const mutation = useUpdateJob(job?.id ?? '');
    const workersQuery = useQuery({
        queryKey: ['workers'],
        queryFn: getWorkers,
        staleTime: 30_000,
        enabled: open,
    });

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [completed, setCompleted] = useState(false);
    const [workerIds, setWorkerIds] = useState<string[]>([]);
    const [lineItems, setLineItems] = useState<LineItemForm[]>([]);

    useEffect(() => {
        if (!job || !open) return;

        setTitle(job.title);
        setDescription(job.description ?? '');
        setCompleted(job.completed);
        setWorkerIds(job.workers.map((worker) => worker.id));
        setLineItems(
            job.lineItems.map((item) => ({
                id: item.id,
                name: item.name,
                quantity: item.quantity,
                unitPriceCents: item.unitPriceCents,
            })),
        );
    }, [job, open]);

    const totalCents = useMemo(() => {
        return lineItems.reduce((sum, item) => {
            return sum + item.quantity * item.unitPriceCents;
        }, 0);
    }, [lineItems]);

    if (!open || !job) return null;

    function updateLineItem(index: number, patch: Partial<LineItemForm>) {
        setLineItems((prev) =>
            prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
        );
    }

    function removeLineItem(index: number) {
        setLineItems((prev) => prev.filter((_, i) => i !== index));
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();

        await mutation.mutateAsync({
            title,
            description,
            workerId: workerIds[0] ?? null,
            workerIds,
            lineItems,
            status: completed ? 'DONE' : job?.status === 'DONE' ? 'SCHEDULED' : job?.status,
        });

        onClose();
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
            <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
                <form onSubmit={onSubmit}>
                    <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                        <div>
                            <p className="text-sm text-slate-500">Edit job</p>
                            <h2 className="text-2xl font-semibold text-slate-900">
                                {job.title}
                            </h2>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl px-3 py-2 text-slate-600 hover:bg-slate-100"
                        >
                            X
                        </button>
                    </div>

                    <div className="grid gap-6 p-6 lg:grid-cols-[1.4fr_1fr]">
                        <div className="space-y-4">
                            <label className="block">
                                <span className="mb-1 block text-sm font-medium text-slate-700">
                                    Subject
                                </span>
                                <input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none ring-0 focus:border-emerald-500"
                                />
                            </label>

                            <label className="block">
                                <span className="mb-1 block text-sm font-medium text-slate-700">
                                    Description / instructions
                                </span>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={5}
                                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none ring-0 focus:border-emerald-500"
                                />
                            </label>

                            <JobWorkerPicker
                                label="Team"
                                workerIds={workerIds}
                                workers={workersQuery.data ?? []}
                                workersLoading={workersQuery.isLoading}
                                helperText="Check every team member who should be assigned to this job."
                                onChange={setWorkerIds}
                            />

                            <label className="inline-flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={completed}
                                    onChange={(e) => setCompleted(e.target.checked)}
                                    className="h-5 w-5 rounded border-slate-300"
                                />
                                <span className="text-sm font-medium text-slate-800">
                                    Completed
                                </span>
                            </label>
                        </div>

                        <div className="space-y-4">
                            <div className="rounded-2xl border border-slate-200 p-4">
                                <h3 className="text-lg font-semibold text-slate-900">Job details</h3>
                                <dl className="mt-4 space-y-3 text-sm">
                                    <div className="flex justify-between gap-4">
                                        <dt className="text-slate-500">Job #</dt>
                                        <dd className="font-medium text-slate-900">{job.jobNumber}</dd>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                        <dt className="text-slate-500">Client</dt>
                                        <dd className="font-medium text-slate-900">
                                            {job.client?.name ?? '-'}
                                        </dd>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                        <dt className="text-slate-500">Status</dt>
                                        <dd className="font-medium text-slate-900">{job.status}</dd>
                                    </div>
                                </dl>
                            </div>

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
                        </div>
                    </div>

                    <div className="px-6 pb-6">
                        <div className="rounded-2xl border border-slate-200">
                            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                                <h3 className="text-lg font-semibold text-slate-900">
                                    Line items
                                </h3>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setLineItems((prev) => [
                                            ...prev,
                                            {
                                                name: '',
                                                quantity: 1,
                                                unitPriceCents: 0,
                                            },
                                        ])
                                    }
                                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                                >
                                    + Add line item
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead>
                                    <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
                                        <th className="px-4 py-3">Item</th>
                                        <th className="px-4 py-3">Qty</th>
                                        <th className="px-4 py-3">Unit Price</th>
                                        <th className="px-4 py-3">Total</th>
                                        <th className="px-4 py-3" />
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {lineItems.map((item, index) => {
                                        const rowTotal =
                                            item.quantity * item.unitPriceCents;

                                        return (
                                            <tr key={item.id ?? index} className="border-b border-slate-100">
                                                <td className="px-4 py-3">
                                                    <input
                                                        value={item.name}
                                                        onChange={(e) =>
                                                            updateLineItem(index, {
                                                                name: e.target.value,
                                                            })
                                                        }
                                                        className="w-full rounded-xl border border-slate-300 px-3 py-2"
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        value={item.quantity}
                                                        onChange={(e) =>
                                                            updateLineItem(index, {
                                                                quantity: Number(e.target.value || 1),
                                                            })
                                                        }
                                                        className="w-24 rounded-xl border border-slate-300 px-3 py-2"
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        step="0.01"
                                                        value={centsToDollars(item.unitPriceCents)}
                                                        onChange={(e) =>
                                                            updateLineItem(index, {
                                                                unitPriceCents: Math.round(
                                                                    Number(e.target.value || 0) * 100,
                                                                ),
                                                            })
                                                        }
                                                        className="w-32 rounded-xl border border-slate-300 px-3 py-2"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 font-medium text-slate-900">
                                                    ${(rowTotal / 100).toFixed(2)}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeLineItem(index)}
                                                        className="rounded-xl px-3 py-2 text-rose-600 hover:bg-rose-50"
                                                    >
                                                        Remove
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {!lineItems.length && (
                                        <tr>
                                            <td
                                                colSpan={5}
                                                className="px-4 py-8 text-center text-slate-500"
                                            >
                                                No line items yet
                                            </td>
                                        </tr>
                                    )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex justify-end px-4 py-4">
                                <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm">
                                    <span className="text-slate-500">Visit total: </span>
                                    <span className="font-semibold text-slate-900">
                                        ${(totalCents / 100).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end border-t border-slate-200 px-6 py-5">
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-2xl border border-slate-300 px-4 py-3 font-medium text-slate-700 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={mutation.isPending}
                                className="rounded-2xl bg-emerald-600 px-5 py-3 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                            >
                                {mutation.isPending ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}


