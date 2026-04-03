import { Link } from "react-router-dom";
import type { ClientPaymentDto } from "../api/clients.types";
import { formatDateTime, formatMoney } from "./formatters";

type Props = {
    payments: ClientPaymentDto[];
};

export function ClientPaymentsSection({ payments }: Props) {
    return (
        <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Payments</h2>
                <p className="text-sm text-slate-500">Payment history for this client.</p>
            </div>

            {payments.length === 0 ? (
                <EmptyState text="No payments yet." />
            ) : (
                <div className="space-y-3">
                    {payments.map((payment) => (
                        <div
                            key={payment.id}
                            className="flex flex-col gap-2 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                            <div>
                                <div className="font-medium text-slate-900">
                                    {formatMoney(payment.amountCents)}
                                </div>
                                <div className="mt-1 text-sm text-slate-500">
                                    {payment.status} | {payment.provider || "Manual"} | {formatDateTime(payment.paidAt)}
                                </div>
                            </div>

                            {payment.jobId ? (
                                <Link
                                    to={`/app/jobs/${payment.jobId}`}
                                    className="text-sm font-medium text-slate-900 hover:underline"
                                >
                                    Related job
                                </Link>
                            ) : null}
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

function EmptyState({ text }: { text: string }) {
    return <div className="rounded-xl border border-dashed p-6 text-sm text-slate-500">{text}</div>;
}
