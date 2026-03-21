import { formatDateTime } from "./formatters";

type Props = {
    comments?: string | null;
    updatedAt?: string | null;
};

export function ClientCustomerCommentsSection({ comments, updatedAt }: Props) {
    return (
        <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Customer comments</h2>
                <p className="text-sm text-slate-500">
                    Customer-provided notes captured from booking and intake flows.
                </p>
            </div>

            {comments?.trim() ? (
                <div className="rounded-xl border p-4">
                    <div className="text-xs text-slate-500">Latest comment • {formatDateTime(updatedAt)}</div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-900">{comments}</p>
                </div>
            ) : (
                <div className="rounded-xl border border-dashed p-6 text-sm text-slate-500">
                    No customer comments on file.
                </div>
            )}
        </section>
    );
}
