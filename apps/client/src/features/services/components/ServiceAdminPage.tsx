import { useMemo, useState } from "react";
import { toast } from "sonner";
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
} from "@/features/services/components/ServicesToolbar";
import {
    toolbarActiveToBool,
    type ServicesToolbarValue,
} from "@/features/services/components/ServicesToolbar.shared";
import { ServicesTable } from "@/features/services/components/ServicesTable";
import { ServicesPagination } from "@/features/services/components/Pagination";
import { ServiceFormDialog } from "@/features/services/components/ServiceFormDialog";
import { useMe } from "@/features/me/hooks/useMe";
import { canManageCompany } from "@/features/me/me.selector";

function getErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;

    const anyError = error as { response?: { data?: { message?: string } }; message?: string };
    return anyError?.response?.data?.message ?? anyError?.message ?? "Something went wrong.";
}

function Card({
    children,
    className = "",
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={["rounded-2xl border border-slate-200 bg-white shadow-sm", className].join(" ")}>
            {children}
        </div>
    );
}

function Stat({
    label,
    value,
    hint,
}: {
    label: string;
    value: number | string;
    hint?: string;
}) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-medium text-slate-500">{label}</div>
                {hint ? <div className="text-[11px] text-slate-400">{hint}</div> : null}
            </div>
            <div className="mt-1 text-lg font-semibold text-slate-900">{value}</div>
        </div>
    );
}

export default function ServicesAdminPage() {
    const { data: me } = useMe();
    const canManage = useMemo(() => canManageCompany(me ?? null), [me]);

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
            active: toolbarActiveToBool(toolbar.active),
            sort: toolbar.sort,
        }),
        [page, pageSize, toolbar],
    );

    const q = useServices(params);
    const createMut = useCreateService();
    const updateMut = useUpdateService();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<ServiceDto | null>(null);

    const items = useMemo(() => q.data?.items ?? [], [q.data?.items]);
    const total = q.data?.total ?? 0;

    const activeCount = useMemo(
        () => items.reduce((acc, service) => acc + (service.active ? 1 : 0), 0),
        [items],
    );
    const inactiveCount = useMemo(
        () => items.reduce((acc, service) => acc + (!service.active ? 1 : 0), 0),
        [items],
    );

    const isSaving = createMut.isPending || updateMut.isPending;

    function openCreate() {
        setEditing(null);
        setDialogOpen(true);
    }

    function openEdit(service: ServiceDto) {
        setEditing(service);
        setDialogOpen(true);
    }

    function closeDialog() {
        setDialogOpen(false);
        setEditing(null);
    }

    function submit(payload: ServiceCreateInput) {
        const toastId = toast.loading(editing ? "Saving changes..." : "Creating service...");

        if (editing) {
            updateMut.mutate(
                { id: editing.id, patch: payload },
                {
                    onSuccess: () => {
                        toast.success("Service updated", { id: toastId });
                        closeDialog();
                    },
                    onError: (error) => {
                        toast.error("Update failed", { id: toastId, description: getErrorMessage(error) });
                    },
                },
            );
            return;
        }

        createMut.mutate(payload, {
            onSuccess: () => {
                toast.success("Service created", { id: toastId });
                closeDialog();
            },
            onError: (error) => {
                toast.error("Create failed", { id: toastId, description: getErrorMessage(error) });
            },
        });
    }

    function toggleActive(service: ServiceDto) {
        if (!canManage) return;

        const nextActive = !service.active;
        const toastId = toast.loading(nextActive ? "Activating..." : "Disabling...");

        updateMut.mutate(
            { id: service.id, patch: { active: nextActive } },
            {
                onSuccess: () => {
                    toast.success(nextActive ? "Service activated" : "Marked as not available", {
                        id: toastId,
                    });
                },
                onError: (error) => {
                    toast.error("Update failed", { id: toastId, description: getErrorMessage(error) });
                },
            },
        );
    }

    function retry() {
        const toastId = toast.loading("Retrying...");
        q.refetch()
            .then(() => toast.success("Reloaded", { id: toastId }))
            .catch((error) => toast.error("Retry failed", { id: toastId, description: getErrorMessage(error) }));
    }

    return (
        <div className="min-h-[calc(100vh-64px)] bg-slate-50">
            <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                            Services
                        </h1>
                        <p className="mt-1 text-sm text-slate-600">
                            Create and manage services.
                        </p>
                    </div>

                    <div className="flex flex-col items-start gap-2 sm:items-end">
                        <button
                            type="button"
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
                        {!canManage ? (
                            <div className="text-xs text-slate-500">
                                You need admin/manager access to create or edit services.
                            </div>
                        ) : null}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Stat label="Total results" value={total} />
                    <Stat label="Active (this page)" value={activeCount} hint="counts current page only" />
                    <Stat label="Inactive (this page)" value={inactiveCount} hint="counts current page only" />
                </div>

                <Card className="p-4">
                    <ServicesToolbar
                        value={toolbar}
                        onChange={(next) => {
                            setToolbar(next);
                            setPage(1);
                        }}
                    />
                </Card>

                {q.isLoading ? (
                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-slate-600">Loading services...</div>
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
                        </div>
                    </Card>
                ) : q.isError ? (
                    <Card className="border-rose-200 bg-rose-50 p-6">
                        <div className="text-sm font-medium text-rose-900">Couldn't load services</div>
                        <div className="mt-1 text-sm text-rose-800">{getErrorMessage(q.error)}</div>
                        <div className="mt-4">
                            <button
                                type="button"
                                onClick={retry}
                                className="inline-flex h-9 items-center rounded-md border border-rose-200 bg-white px-3 text-sm font-medium text-slate-900 hover:bg-rose-50"
                            >
                                Retry
                            </button>
                        </div>
                    </Card>
                ) : items.length === 0 ? (
                    <Card className="p-10 text-center">
                        <div className="text-sm font-semibold text-slate-900">No services found</div>
                        <div className="mt-1 text-sm text-slate-600">
                            {toolbar.search
                                ? "Try a different search."
                                : "Create your first service to start booking jobs."}
                        </div>
                        {canManage ? (
                            <div className="mt-5">
                                <button
                                    type="button"
                                    onClick={openCreate}
                                    className="inline-flex h-10 items-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
                                >
                                    + New service
                                </button>
                            </div>
                        ) : null}
                    </Card>
                ) : (
                    <>
                        <Card className="overflow-hidden">
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
                    isSubmitting={isSaving}
                />
            </div>
        </div>
    );
}
