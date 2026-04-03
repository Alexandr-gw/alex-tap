import type { JobDetailsDto } from "../api/jobs.types";

type Props = {
    job: JobDetailsDto;
};

export function JobLineItemsCard({ job }: Props) {
    const total = job.lineItems.reduce((sum, item) => sum + item.totalCents, 0);

    return (
        <section className="rounded-3xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                <h2 className="text-2xl font-semibold text-slate-900">Line items</h2>
                <button
                    type="button"
                    className="rounded-2xl border border-slate-300 px-4 py-2.5 font-medium text-emerald-700 hover:bg-emerald-50"
                >
                    Add line item
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead>
                    <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
                        <th className="px-6 py-3">Product / Service</th>
                        <th className="px-6 py-3">Qty.</th>
                        <th className="px-6 py-3">Unit Price</th>
                        <th className="px-6 py-3">Total</th>
                    </tr>
                    </thead>
                    <tbody>
                    {job.lineItems.map((item) => (
                        <tr key={item.id} className="border-b border-slate-100">
                            <td className="px-6 py-4 font-medium text-slate-900">{item.name}</td>
                            <td className="px-6 py-4 text-slate-700">{item.quantity}</td>
                            <td className="px-6 py-4 text-slate-700">
                                ${(item.unitPriceCents / 100).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 font-medium text-slate-900">
                                ${(item.totalCents / 100).toFixed(2)}
                            </td>
                        </tr>
                    ))}

                    {!job.lineItems.length && (
                        <tr>
                            <td colSpan={4} className="px-6 py-10 text-center text-slate-500">
                                No line items yet
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-end px-6 py-5">
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                    <span className="text-slate-500">Total: </span>
                    <span className="font-semibold text-slate-900">
                        ${(total / 100).toFixed(2)}
                    </span>
                </div>
            </div>
        </section>
    );
}
