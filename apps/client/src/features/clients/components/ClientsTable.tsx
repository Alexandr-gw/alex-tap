import { Link } from "react-router-dom";
import type { ClientListItemDto } from "../api/clients.types";
import { formatDate } from "./formatters";

type SortDirection = "asc" | "desc" | null;

type Props = {
    items: ClientListItemDto[];
    isLoading?: boolean;
    sortDirection?: SortDirection;
    onToggleNameSort?: () => void;
};

function getClientStatus(client: ClientListItemDto) {
    return client.jobsCount > 0 || client.lastJobAt ? "Active" : "New";
}

export function ClientsTable({
    items,
    isLoading = false,
    sortDirection = null,
    onToggleNameSort,
}: Props) {
    if (isLoading) {
        return (
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Loading clients...</div>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
                <h2 className="text-base font-semibold text-slate-900">No clients found</h2>
                <p className="mt-2 text-sm text-slate-500">
                    Try a different search or add a new client.
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
                            <th className="px-5 py-3 font-medium">Email</th>
                            <th className="px-5 py-3 font-medium">Status</th>
                            <th className="px-5 py-3 font-medium">Last job</th>
                        </tr>
                    </thead>

                    <tbody>
                        {items.map((client) => {
                            const status = getClientStatus(client);

                            return (
                                <tr
                                    key={client.id}
                                    className="border-t border-slate-200 text-sm transition hover:bg-slate-50/80"
                                >
                                    <td className="px-5 py-4 align-top">
                                        <Link
                                            to={`/app/clients/${client.id}`}
                                            className="font-semibold text-slate-900 hover:underline"
                                        >
                                            {client.name}
                                        </Link>
                                        {client.address ? (
                                            <div className="mt-1 text-xs text-slate-500">{client.address}</div>
                                        ) : null}
                                    </td>

                                    <td className="px-5 py-4 align-top text-slate-700">
                                        {client.phone || "N/A"}
                                    </td>
                                    <td className="px-5 py-4 align-top text-slate-700">
                                        {client.email || "N/A"}
                                    </td>
                                    <td className="px-5 py-4 align-top text-slate-700">
                                        <span
                                            className={[
                                                "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                                                status === "Active"
                                                    ? "bg-emerald-50 text-emerald-700"
                                                    : "bg-sky-50 text-sky-700",
                                            ].join(" ")}
                                        >
                                            {status}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 align-top text-slate-700">
                                        {formatDate(client.lastJobAt)}
                                    </td>
                                </tr>
                            );
                        })}
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
