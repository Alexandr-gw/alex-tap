import type { WorkerListItemDto } from "../api/settings.types";

type SortDirection = "asc" | "desc" | null;

type Props = {
    items: WorkerListItemDto[];
    isLoading?: boolean;
    sortDirection?: SortDirection;
    onToggleNameSort: () => void;
    onEdit: (worker: WorkerListItemDto) => void;
};

export function WorkersTable({
    items,
    isLoading = false,
    sortDirection = null,
    onToggleNameSort,
    onEdit,
}: Props) {
    if (isLoading) {
        return (
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
                <p className="text-sm text-slate-500">Loading workers...</p>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="rounded-2xl border bg-white p-8 text-center shadow-sm">
                <h2 className="text-base font-semibold text-slate-900">No workers found</h2>
                <p className="mt-2 text-sm text-slate-500">
                    Try another search or add a new worker.
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
            <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                    <thead className="bg-slate-50">
                        <tr className="text-left text-sm text-slate-600">
                            <th className="px-4 py-3 font-medium">
                                <button
                                    type="button"
                                    onClick={onToggleNameSort}
                                    className="inline-flex items-center gap-1.5 text-left text-sm font-medium text-slate-600 hover:text-slate-900"
                                >
                                    <span>Name</span>
                                    <SortArrows direction={sortDirection} />
                                </button>
                            </th>
                            <th className="px-4 py-3 font-medium">Phone</th>
                            <th className="px-4 py-3 font-medium">Linked account</th>
                            <th className="px-4 py-3 font-medium">Role</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium"></th>
                        </tr>
                    </thead>

                    <tbody>
                        {items.map((worker) => (
                            <tr
                                key={worker.id}
                                className="border-t text-sm transition hover:bg-slate-50/80"
                            >
                                <td className="px-4 py-3 font-medium text-slate-900">{worker.name}</td>
                                <td className="px-4 py-3 text-slate-700">{worker.phone || "N/A"}</td>
                                <td className="px-4 py-3 text-slate-700">{worker.linkedUserEmail || "Not linked"}</td>
                                <td className="px-4 py-3 text-slate-700">{worker.role || "N/A"}</td>
                                <td className="px-4 py-3 text-slate-700">
                                    {worker.active ? "Active" : "Inactive"}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <button
                                        type="button"
                                        onClick={() => onEdit(worker)}
                                        className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
                                    >
                                        Edit
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function SortArrows({ direction }: { direction: SortDirection }) {
    return (
        <span className="flex flex-col text-[8px] leading-[7px]">
            <span className={direction === "asc" ? "text-slate-700" : "text-slate-300"}>▲</span>
            <span className={direction === "desc" ? "text-slate-700" : "text-slate-300"}>▼</span>
        </span>
    );
}
