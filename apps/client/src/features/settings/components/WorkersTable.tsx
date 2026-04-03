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
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Loading workers...</p>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
                <h2 className="text-base font-semibold text-slate-900">No workers found</h2>
                <p className="mt-2 text-sm text-slate-500">
                    Try another search or add a new worker.
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                    <thead className="bg-slate-50 text-left text-sm text-slate-600">
                        <tr>
                            <th className="px-5 py-3 font-medium">
                                <button
                                    type="button"
                                    onClick={onToggleNameSort}
                                    className="inline-flex items-center gap-1.5 text-left text-sm font-medium text-slate-600 hover:text-slate-900"
                                >
                                    <span>Name</span>
                                    <SortArrows direction={sortDirection} />
                                </button>
                            </th>
                            <th className="px-5 py-3 font-medium">Phone</th>
                            <th className="px-5 py-3 font-medium">Linked account</th>
                            <th className="px-5 py-3 font-medium">Role</th>
                            <th className="px-5 py-3 font-medium">Status</th>
                            <th className="px-5 py-3 font-medium"></th>
                        </tr>
                    </thead>

                    <tbody>
                        {items.map((worker) => (
                            <tr
                                key={worker.id}
                                className="border-t border-slate-200 text-sm transition hover:bg-slate-50/80"
                            >
                                <td className="px-5 py-4 align-top">
                                    <div className="font-semibold text-slate-900">{worker.name}</div>
                                    <div className="mt-1 text-xs text-slate-500">
                                        {worker.colorTag || "No color tag"}
                                    </div>
                                </td>
                                <td className="px-5 py-4 align-top text-slate-700">{worker.phone || "N/A"}</td>
                                <td className="px-5 py-4 align-top text-slate-700">{worker.linkedUserEmail || "Not linked"}</td>
                                <td className="px-5 py-4 align-top text-slate-700">{worker.role || "N/A"}</td>
                                <td className="px-5 py-4 align-top text-slate-700">
                                    <span
                                        className={[
                                            "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                                            worker.active
                                                ? "bg-emerald-50 text-emerald-700"
                                                : "bg-slate-100 text-slate-700",
                                        ].join(" ")}
                                    >
                                        {worker.active ? "Active" : "Inactive"}
                                    </span>
                                </td>
                                <td className="px-5 py-4 text-right align-top">
                                    <button
                                        type="button"
                                        onClick={() => onEdit(worker)}
                                        className="rounded-xl border border-sky-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-emerald-200 hover:bg-sky-50"
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
