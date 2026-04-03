import { useState } from "react";
import { useParams } from "react-router-dom";
import { ClientCustomerCommentsSection } from "../components/ClientCustomerCommentsSection";
import { ClientInfoCard } from "../components/ClientInfoCard";
import { ClientNotesSection } from "../components/ClientNotesSection";
import { ClientPaymentsSection } from "../components/ClientPaymentsSection";
import { ClientWorkSection } from "../components/ClientWorkSection";
import { EditClientDialog } from "../components/EditClientDialog";
import { useClient, useUpdateClient } from "../hooks/clients.queries";

export function ClientDetailsPage() {
    const { clientId = "" } = useParams();
    const [editOpen, setEditOpen] = useState(false);

    const clientQuery = useClient(clientId);
    const updateClientMutation = useUpdateClient(clientId);

    const client = clientQuery.data;

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
            </div>

            <EditClientDialog
                open={editOpen}
                client={client}
                isSaving={updateClientMutation.isPending}
                onClose={() => setEditOpen(false)}
                onSubmit={async (input) => {
                    await updateClientMutation.mutateAsync(input);
                    setEditOpen(false);
                }}
            />
        </>
    );
}
