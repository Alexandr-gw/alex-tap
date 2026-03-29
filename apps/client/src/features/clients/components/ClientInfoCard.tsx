import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { ClientDetailsDto } from '../api/clients.types';
import { formatDate, formatDateTime } from './formatters';

type Props = {
    client: ClientDetailsDto;
    onEdit: () => void;
};

export function ClientInfoCard({ client, onEdit }: Props) {
    const lastCommunication = client.lastCommunication;

    return (
        <section className="rounded-[2rem] border border-emerald-100/80 bg-[linear-gradient(135deg,#ffffff_0%,#effcf5_44%,#eef7ff_100%)] p-6 shadow-sm">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
                        Client profile
                    </div>
                    <h1 className="mt-3 text-3xl font-semibold text-slate-900">{client.name}</h1>
                    <p className="mt-2 text-sm text-slate-500">
                        Customer since {formatDate(client.createdAt)}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onEdit}
                    className="rounded-xl border border-sky-100 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-sky-200 hover:bg-sky-50"
                >
                    Edit client
                </button>
            </div>

            <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,320px)_1fr]">
                <div>
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                        Contact info
                    </h2>
                    <dl className="mt-4 space-y-3 text-sm text-slate-700">
                        <DetailRow label="Phone" value={client.phone || 'N/A'} />
                        <DetailRow
                            label="Email"
                            value={client.email ? (
                                <a href={`mailto:${client.email}`} className="text-emerald-700 hover:underline">
                                    {client.email}
                                </a>
                            ) : (
                                'N/A'
                            )}
                        />
                        <DetailRow
                            label="Last communication"
                            value={
                                lastCommunication ? (
                                    <div className="space-y-1">
                                        <div>{lastCommunication.label}</div>
                                        <div className="text-slate-500">
                                            {formatDateTime(lastCommunication.sentAt)}
                                            {lastCommunication.recipient ? ` to ${lastCommunication.recipient}` : ''}
                                        </div>
                                        <Link
                                            to={`/app/jobs/${lastCommunication.jobId}`}
                                            className="text-emerald-700 hover:underline"
                                        >
                                            Open related job
                                        </Link>
                                    </div>
                                ) : (
                                    'No communication sent yet.'
                                )
                            }
                        />
                    </dl>
                </div>

                <div>
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                        Address
                    </h2>
                    <p className="mt-4 whitespace-pre-wrap text-sm text-slate-700">
                        {client.address || 'No address on file.'}
                    </p>
                </div>
            </div>
        </section>
    );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-4">
            <dt className="text-slate-500">{label}</dt>
            <dd className="min-w-0 break-words text-slate-900">{value}</dd>
        </div>
    );
}
