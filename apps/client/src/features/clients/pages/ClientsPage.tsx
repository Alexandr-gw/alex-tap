import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ClientsPagination } from "../components/ClientsPagination";
import { ClientsTable } from "../components/ClientsTable";
import { ClientsToolbar } from "../components/ClientsToolbar";
import { EditClientDialog } from "../components/EditClientDialog";
import { useClients, useCreateClient } from "../hooks/clients.queries";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

type SortDirection = "asc" | "desc" | null;

function getSortDirection(value: string | null): SortDirection {
    if (value === "name_asc") return "asc";
    if (value === "name_desc") return "desc";
    return null;
}

export function ClientsPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [createOpen, setCreateOpen] = useState(false);

    const search = searchParams.get("search") ?? "";
    const page = Number(searchParams.get("page") ?? DEFAULT_PAGE) || DEFAULT_PAGE;
    const limit = Number(searchParams.get("limit") ?? DEFAULT_LIMIT) || DEFAULT_LIMIT;
    const sortDirection = getSortDirection(searchParams.get("sort"));

    const queryParams = useMemo(
        () => ({
            search,
            page,
            limit,
        }),
        [search, page, limit],
    );

    const clientsQuery = useClients(queryParams);
    const createClientMutation = useCreateClient();

    function updateParams(next: Partial<{ search: string; page: number; limit: number; sort: string | null }>) {
        const nextParams = new URLSearchParams(searchParams);

        if (typeof next.search === "string") {
            if (next.search.trim()) nextParams.set("search", next.search.trim());
            else nextParams.delete("search");
            nextParams.set("page", "1");
        }

        if (typeof next.page === "number") {
            nextParams.set("page", String(next.page));
        }

        if (typeof next.limit === "number") {
            nextParams.set("limit", String(next.limit));
            nextParams.set("page", "1");
        }

        if (next.sort !== undefined) {
            if (next.sort) nextParams.set("sort", next.sort);
            else nextParams.delete("sort");
        }

        setSearchParams(nextParams);
    }

    function handleToggleNameSort() {
        const nextSort = sortDirection === "asc" ? "name_desc" : "name_asc";
        updateParams({ sort: nextSort });
    }

    const data = clientsQuery.data;
    const sortedItems = useMemo(() => {
        const items = data?.items ?? [];
        if (!sortDirection) return items;

        return [...items].sort((a, b) => {
            const result = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
            return sortDirection === "asc" ? result : -result;
        });
    }, [data?.items, sortDirection]);

    return (
        <div className="space-y-6">
            <section className="rounded-[2rem] border border-emerald-100/80 bg-[linear-gradient(135deg,#ffffff_0%,#effcf5_44%,#eef7ff_100%)] p-6 shadow-sm">
                <div className="max-w-2xl">
                    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
                        Clients
                    </div>
                    <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                        Keep client details, notes, and booking history easy to reach.
                    </h1>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                        Search your client base quickly, open detailed records, and add new customers without leaving the workspace flow.
                    </p>
                </div>
            </section>

            <ClientsToolbar
                value={search}
                onSearchChange={(value) => updateParams({ search: value })}
                onCreateClick={() => setCreateOpen(true)}
            />

            {clientsQuery.isError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    Failed to load clients.
                </div>
            ) : (
                <>
                    <ClientsTable
                        items={sortedItems}
                        isLoading={clientsQuery.isLoading}
                        sortDirection={sortDirection}
                        onToggleNameSort={handleToggleNameSort}
                    />

                    <ClientsPagination
                        page={data?.meta.page ?? page}
                        totalPages={data?.meta.totalPages ?? 1}
                        onPageChange={(nextPage) => updateParams({ page: nextPage })}
                    />
                </>
            )}

            <EditClientDialog
                open={createOpen}
                client={null}
                mode="create"
                isSaving={createClientMutation.isPending}
                onClose={() => setCreateOpen(false)}
                onSubmit={async (input) => {
                    await createClientMutation.mutateAsync(input as never);
                    setCreateOpen(false);
                }}
            />
        </div>
    );
}
