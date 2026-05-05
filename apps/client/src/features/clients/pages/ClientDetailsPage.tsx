import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/useConfirm";
import { isApiError } from "@/lib/api/apiError";
import { ClientCustomerCommentsSection } from "../components/ClientCustomerCommentsSection";
import { ClientInfoCard } from "../components/ClientInfoCard";
import { ClientNotesSection } from "../components/ClientNotesSection";
import { ClientPaymentsSection } from "../components/ClientPaymentsSection";
import { ClientWorkSection } from "../components/ClientWorkSection";
import { EditClientDialog } from "../components/EditClientDialog";
import { useClient, useDeleteClient, useUpdateClient } from "../hooks/clients.queries";

export function ClientDetailsPage() {
    const { clientId = "" } = useParams();
    const navigate = useNavigate();
    const [editOpen, setEditOpen] = useState(false);
    const { confirm, ConfirmUI } = useConfirm();

    const clientQuery = useClient(clientId);
    const updateClientMutation = useUpdateClient(clientId);
    const deleteClientMutation = useDeleteClient(clientId);

    const client = clientQuery.data;

    async function handleDelete() {
        const confirmed = await confirm({
            title: "Delete client?",
            description: "This removes the client from active lists and customer pickers.",
            confirmText: "Delete client",
            cancelText: "Keep client",
            danger: true,
        });

        if (!confirmed) return;

        try {
            await deleteClientMutation.mutateAsync();
            setEditOpen(false);
            toast.success("Client deleted.");
            navigate("/app/clients");
        } catch (error) {
            const message = isApiError(error)
                ? error.message
                : error instanceof Error
                    ? error.message
                    : "Unable to delete client.";
            toast.error(message);
        }
    }

    if (clientQuery.isLoading) {
        return (
            <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
                <p className="text-sm text-slate-500">Loading client...</p>
            </div>
        );
    }

    if (clientQuery.isError || !client) {
        return (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
                <h1 className="text-lg font-semibold text-red-800">Client not found</h1>
                <p className="mt-2 text-sm text-red-700">
                    We could not load this client record.
                </p>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-6">
                <ClientInfoCard client={client} onEdit={() => setEditOpen(true)} />

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_380px]">
                    <div className="space-y-6">
                        <ClientWorkSection jobs={client.jobs} tasks={client.tasks} />
                    </div>

                    <div className="space-y-6">
                        <ClientCustomerCommentsSection
                            comments={client.customerComments}
                            updatedAt={client.updatedAt}
                        />
                        <ClientPaymentsSection payments={client.payments} />
                        <ClientNotesSection
                            notes={client.internalNotes}
                            updatedAt={client.updatedAt}
                            onEdit={() => setEditOpen(true)}
                        />
                    </div>
                </div>

                <section className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-red-900">Delete client</h2>
                    <p className="mt-2 text-sm text-red-700">
                        This hides the client from active client lists and task customer pickers. Historical jobs keep their recorded client details.
                    </p>
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={deleteClientMutation.isPending}
                        className="mt-4 rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {deleteClientMutation.isPending ? "Deleting..." : "Delete client"}
                    </button>
                </section>
            </div>

            <EditClientDialog
                open={editOpen}
                client={client}
                isSaving={updateClientMutation.isPending}
                isDeleting={deleteClientMutation.isPending}
                onClose={() => setEditOpen(false)}
                onSubmit={async (input) => {
                    await updateClientMutation.mutateAsync(input);
                    setEditOpen(false);
                }}
                onDelete={handleDelete}
            />
            {ConfirmUI}
        </>
    );
}
