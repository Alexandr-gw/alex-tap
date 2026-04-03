import { useMemo, useState } from 'react';
import type { JobDetailsDto } from '../api/jobs.types';
import { useRequestJobPayment } from '../hooks/jobs.queries';

type Props = {
    job: JobDetailsDto;
};

export function JobInvoicesCard({ job }: Props) {
    const mutation = useRequestJobPayment(job.id);
    const [latestLink, setLatestLink] = useState<string | null>(null);
    const amountDueCents = useMemo(
        () => job.lineItems.reduce((sum, item) => sum + item.totalCents, 0),
        [job.lineItems],
    );

    async function handleRequestPayment() {
        const response = await mutation.mutateAsync({});
        setLatestLink(response.url);
    }

    async function copyLatestLink() {
        if (!latestLink) return;
        await navigator.clipboard.writeText(latestLink);
    }

    return (
        <section className="rounded-3xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                <div>
                    <h2 className="text-2xl font-semibold text-slate-900">Payment requests</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Request a payment link based on the current line items.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleRequestPayment}
                    disabled={mutation.isPending || amountDueCents <= 0}
                    className="rounded-2xl border border-slate-300 px-4 py-2.5 font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                >
                    {mutation.isPending ? 'Creating...' : 'Request payment'}
                </button>
            </div>

            <div className="space-y-5 px-6 py-5">
                {latestLink ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                        <p className="text-sm font-medium text-emerald-900">Latest payment link</p>
                        <p className="mt-2 break-all text-sm text-emerald-800">{latestLink}</p>
                        <div className="mt-3 flex gap-3">
                            <button
                                type="button"
                                onClick={copyLatestLink}
                                className="rounded-xl border border-emerald-300 px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
                            >
                                Copy link
                            </button>
                            <a
                                href={latestLink}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-xl bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800"
                            >
                                Open link
                            </a>
                        </div>
                    </div>
                ) : null}

                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                        <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
                            <th className="px-2 py-3">Created</th>
                            <th className="px-2 py-3">Status</th>
                            <th className="px-2 py-3">Amount</th>
                            <th className="px-2 py-3">Receipt</th>
                        </tr>
                        </thead>
                        <tbody>
                        {job.payments.map((payment) => (
                            <tr key={payment.id} className="border-b border-slate-100">
                                <td className="px-2 py-4 text-slate-700">
                                    {new Intl.DateTimeFormat(undefined, {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                        hour: 'numeric',
                                        minute: '2-digit',
                                    }).format(new Date(payment.createdAt))}
                                </td>
                                <td className="px-2 py-4 text-slate-700">{payment.status}</td>
                                <td className="px-2 py-4 text-slate-700">
                                    {(payment.amountCents / 100).toLocaleString(undefined, {
                                        style: 'currency',
                                        currency: payment.currency,
                                    })}
                                </td>
                                <td className="px-2 py-4 text-slate-700">
                                    {payment.receiptUrl ? (
                                        <a href={payment.receiptUrl} target="_blank" rel="noreferrer" className="text-emerald-700 underline">
                                            Open receipt
                                        </a>
                                    ) : (
                                        '-'
                                    )}
                                </td>
                            </tr>
                        ))}

                        {!job.payments.length && (
                            <tr>
                                <td colSpan={4} className="px-2 py-10 text-center text-slate-500">
                                    No payment requests yet
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
}
