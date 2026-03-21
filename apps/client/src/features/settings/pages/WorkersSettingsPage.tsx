import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ClientsPagination } from "@/features/clients/components/ClientsPagination";
import { WorkerFormDialog } from "../components/WorkerFormDialog";
import { WorkersTable } from "../components/WorkersTable";
import { WorkersToolbar } from "../components/WorkersToolbar";
import type { WorkerListItemDto } from "../api/settings.types";
import { useCreateWorker, useUpdateWorker, useWorkers } from "../hooks/settings.queries";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

type SortDirection = "asc" | "desc" | null;

function getSortDirection(value: string | null): SortDirection {
    if (value === "name_asc") return "asc";
    if (value === "name_desc") return "desc";
    return null;
}

export function WorkersSettingsPage() {
    const [searchParams, setSearchParams] = useSearchParams();

    const search = searchParams.get("search") ?? "";
    const page = Number(searchParams.get("page") ?? DEFAULT_PAGE) || DEFAULT_PAGE;
    const limit = Number(searchParams.get("limit") ?? DEFAULT_LIMIT) || DEFAULT_LIMIT;
    const sortDirection = getSortDirection(searchParams.get("sort"));

    const params = useMemo(() => ({ search, page, limit }), [search, page, limit]);

    const workersQuery = useWorkers(params);
    const createMutation = useCreateWorker();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [mode, setMode] = useState<"create" | "edit">("create");
    const [selectedWorker, setSelectedWorker] = useState<WorkerListItemDto | null>(null);

    const updateMutation = useUpdateWorker(selectedWorker?.id ?? "");

    function updateParams(
        next: Partial<{ search: string; page: number; limit: number; sort: string | null }>,
        options?: { replace?: boolean },
    ) {
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

        setSearchParams(nextParams, { replace: options?.replace ?? false });
    }

    function handleToggleNameSort() {
        const nextSort = sortDirection === "asc" ? "name_desc" : "name_asc";
        updateParams({ sort: nextSort });
    }

    const sortedItems = useMemo(() => {
        const items = workersQuery.data?.items ?? [];
        if (!sortDirection) return items;

        return [...items].sort((a, b) => {
            const result = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
            return sortDirection === "asc" ? result : -result;
        });
    }, [workersQuery.data?.items, sortDirection]);

    function openCreate() {
        setMode("create");
        setSelectedWorker(null);
        setDialogOpen(true);
    }

    function openEdit(worker: WorkerListItemDto) {
        setMode("edit");
        setSelectedWorker(worker);
        setDialogOpen(true);
    }

    return (
        <>
            <div className="space-y-6">
                <h1 className="text-2xl font-semibold text-slate-900">Workers</h1>

                <WorkersToolbar
                    value={search}
                    onSearchChange={(value) => updateParams({ search: value }, { replace: true })}
                    onCreateClick={openCreate}
                />

                {workersQuery.isError ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        Failed to load workers.
                    </div>
                ) : (
                    <>
                        <WorkersTable
                            items={sortedItems}
                            isLoading={workersQuery.isLoading}
                            sortDirection={sortDirection}
                            onToggleNameSort={handleToggleNameSort}
                            onEdit={openEdit}
                        />

                        <ClientsPagination
                            page={workersQuery.data?.meta.page ?? page}
                            totalPages={workersQuery.data?.meta.totalPages ?? 1}
                            onPageChange={(nextPage) => updateParams({ page: nextPage })}
                        />
                    </>
                )}
            </div>

            <WorkerFormDialog
                open={dialogOpen}
                mode={mode}
                worker={selectedWorker}
                isSaving={createMutation.isPending || updateMutation.isPending}
                onClose={() => setDialogOpen(false)}
                onSubmit={async (input) => {
                    if (mode === "create") {
                        await createMutation.mutateAsync(input as never);
                    } else if (selectedWorker?.id) {
                        await updateMutation.mutateAsync(input as never);
                    }

                    setDialogOpen(false);
                }}
            />
        </>
    );
}
