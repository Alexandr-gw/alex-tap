// src/features/services/components/ServicesTable.tsx
import type { ServiceDto } from "../api/services.types";

function money(cents: number, currency = "CAD") {
    const v = (cents ?? 0) / 100;
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(v);
}

export function ServicesTable(props: {
    items: ServiceDto[];
    canManage: boolean;
    onEdit: (svc: ServiceDto) => void;
    onToggleActive: (svc: ServiceDto) => void;
    isMutating?: boolean;
}) {
    const { items, canManage, onEdit, onToggleActive, isMutating } = props;

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Price</th>
                    <th className="px-4 py-3 font-medium">Duration</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                {items.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3">
                            <div className="font-medium text-slate-900">{s.name}</div>
                            <div className="text-xs text-slate-500">Updated {new Date(s.updatedAt).toLocaleDateString()}</div>
                        </td>

                        <td className="px-4 py-3">{money(s.basePriceCents, s.currency)}</td>
                        <td className="px-4 py-3">{s.durationMins} min</td>

                        <td className="px-4 py-3">
                            {s.active ? (
                                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
                    Active
                  </span>
                            ) : (
                                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                    Not available
                  </span>
                            )}
                        </td>

                        <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => onEdit(s)}
                                    disabled={!canManage}
                                    className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm disabled:opacity-50"
                                >
                                    Edit
                                </button>

                                <button
                                    onClick={() => onToggleActive(s)}
                                    disabled={!canManage || isMutating}
                                    className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm disabled:opacity-50"
                                >
                                    {s.active ? "Mark not available" : "Activate"}
                                </button>
                            </div>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}
