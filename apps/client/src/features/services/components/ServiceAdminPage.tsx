// src/features/services/ServicesAdminPage.tsx
import { useMemo, useState } from "react";
import {
    useCreateService,
    useServices,
    useUpdateService,
} from "@/features/services/hooks/services.queries";
import type {
    ServiceCreateInput,
    ServiceDto,
} from "@/features/services/api/services.types";
import {
    ServicesToolbar,
    type ServicesToolbarValue,
} from "@/features/services/components/ServicesToolbar";
import { ServicesTable } from "@/features/services/components/ServicesTable";
import { ServicesPagination } from "@/features/services/components/Pagination";
import { ServiceFormDialog } from "@/features/services/components/ServiceFormDialog";
import { useMe } from "@/features/me/hooks/useMe";
import { canManageCompany } from "@/features/me/me.selector";

function toActiveParam(v: ServicesToolbarValue["active"]): boolean | undefined {
    if (v === "active") return true;
    if (v === "inactive") return false;
    return undefined;
}

function Card({
                  children,
                  className = "",
              }: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={[
                "rounded-2xl border border-slate-200 bg-white shadow-sm",
                className,
            ].join(" ")}
        >
            {children}
        </div>
    );
}

function Stat({ label, value }: { label: string; value: number | string }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="text-xs font-medium text-slate-500">{label}</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">{value}</div>
        </div>
    );
}

export default function ServicesAdminPage() {
    const { data: me } = useMe();
    const canManage = canManageCompany(me ?? null);

    const [page, setPage] = useState(1);
    const pageSize = 20;

    const [toolbar, setToolbar] = useState<ServicesToolbarValue>({
        search: "",
        active: "all",
        sort: "-updatedAt",
    });

    const params = useMemo(
        () => ({
            page,
            pageSize,
            search: toolbar.search || undefined,
            active: toActiveParam(toolbar.active),
            sort: toolbar.sort,
        }),
        [page, pageSize, toolbar]
    );

    const q = useServices(params);
    const createMut = useCreateService();
    const updateMut = useUpdateService();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<ServiceDto | null>(null);

    const items = q.data?.items ?? [];
    const total = q.data?.total ?? 0;

    const activeCount = useMemo(
        () => items.reduce((acc, s) => acc + (s.active ? 1 : 0), 0),
        [items]
    );
    const inactiveCount = useMemo(
        () => items.reduce((acc, s) => acc + (!s.active ? 1 : 0), 0),
        [items]
    );

    function openCreate() {
        setEditing(null);
        setDialogOpen(true);
    }

    function openEdit(svc: ServiceDto) {
        setEditing(svc);
        setDialogOpen(true);
    }

    function closeDialog() {
        setDialogOpen(false);
        setEditing(null);
    }

    function submit(payload: ServiceCreateInput) {
        if (editing) {
            updateMut.mutate({ id: editing.id, patch: payload });
        } else {
            createMut.mutate(payload);
        }
        closeDialog();
    }

    function toggleActive(svc: ServiceDto) {
        updateMut.mutate({ id: svc.id, patch: { active: !svc.active } });
    }

    return (
        <div className="min-h-[calc(100vh-64px)] bg-slate-50">
            <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                            Services
                        </h1>
                        <p className="mt-1 text-sm text-slate-600">
                            Create and manage services. Disable instead of deleting (keeps old
                            jobs intact).
                        </p>
                    </div>

                    <div className="flex flex-col items-start gap-2 sm:items-end">
                        <button
                            onClick={openCreate}
                            disabled={!canManage}
                            className={[
                                "inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium",
                                "bg-slate-900 text-white shadow-sm hover:bg-slate-800",
                                "focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2",
                                "disabled:cursor-not-allowed disabled:opacity-50",
                            ].join(" ")}
                        >
                            + New service
                        </button>
                        {!canManage && (
                            <div className="text-xs text-slate-500">
                                You need admin/manager access to create or edit services.
                            </div>
                        )}
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Stat label="Total results" value={total} />
                    <Stat label="Active (this page)" value={activeCount} />
                    <Stat label="Inactive (this page)" value={inactiveCount} />
                </div>

                {/* Toolbar */}
                <Card className="p-4">
                    <ServicesToolbar
                        value={toolbar}
                        onChange={(next) => {
                            setToolbar(next);
                            setPage(1);
                        }}
                    />
                </Card>

                {/* Content */}
                {q.isLoading ? (
                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-slate-600">Loading services…</div>
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
                        </div>
                    </Card>
                ) : q.isError ? (
                    <Card className="border-rose-200 bg-rose-50 p-6">
                        <div className="text-sm font-medium text-rose-900">
                            Couldn’t load services
                        </div>
                        <div className="mt-1 text-sm text-rose-800">
                            {(q.error as Error)?.message}
                        </div>
                        <div className="mt-4">
                            <button
                                onClick={() => q.refetch()}
                                className="inline-flex h-9 items-center rounded-md border border-rose-200 bg-white px-3 text-sm font-medium text-slate-900 hover:bg-rose-50"
                            >
                                Retry
                            </button>
                        </div>
                    </Card>
                ) : items.length === 0 ? (
                    <Card className="p-10 text-center">
                        <div className="text-sm font-semibold text-slate-900">
                            No services found
                        </div>
                        <div className="mt-1 text-sm text-slate-600">
                            {toolbar.search
                                ? "Try a different search."
                                : "Create your first service to start booking jobs."}
                        </div>
                        {canManage && (
                            <div className="mt-5">
                                <button
                                    onClick={openCreate}
                                    className="inline-flex h-10 items-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
                                >
                                    + New service
                                </button>
                            </div>
                        )}
                    </Card>
                ) : (
                    <>
                        <Card className="overflow-hidden">
                            <div className="border-b border-slate-200 bg-slate-50 p-4">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm font-medium text-slate-900">
                                        Services list
                                    </div>
                                    {(createMut.isPending || updateMut.isPending) && (
                                        <div className="text-xs text-slate-600">Saving…</div>
                                    )}
                                </div>
                            </div>

                            <ServicesTable
                                items={items}
                                canManage={canManage}
                                onEdit={openEdit}
                                onToggleActive={toggleActive}
                                isMutating={updateMut.isPending}
                            />
                        </Card>

                        <Card className="p-3">
                            <ServicesPagination
                                page={q.data!.page}
                                pageSize={q.data!.pageSize}
                                total={total}
                                onPageChange={setPage}
                            />
                        </Card>
                    </>
                )}

                <ServiceFormDialog
                    open={dialogOpen}
                    title={editing ? "Edit service" : "Create service"}
                    initial={editing}
                    onClose={closeDialog}
                    onSubmit={submit}
                    isSubmitting={createMut.isPending || updateMut.isPending}
                />
            </div>
        </div>
    );
}
