import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient, deleteClient, getClientById, getClients, updateClient } from "../api/clients.api";
import type { ClientsListParams, CreateClientInput, UpdateClientInput } from "../api/clients.types";

export const clientsKeys = {
    all: ["clients"] as const,
    list: (params: ClientsListParams) => ["clients", "list", params] as const,
    detail: (clientId: string) => ["clients", "detail", clientId] as const,
};

export function useClients(params: ClientsListParams) {
    return useQuery({
        queryKey: clientsKeys.list(params),
        queryFn: () => getClients(params),
        placeholderData: (previousData) => previousData,
    });
}

export function useClient(clientId: string) {
    return useQuery({
        queryKey: clientsKeys.detail(clientId),
        queryFn: () => getClientById(clientId),
        enabled: Boolean(clientId),
    });
}

export function useCreateClient() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: CreateClientInput) => createClient(input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: clientsKeys.all });
        },
    });
}

export function useUpdateClient(clientId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: UpdateClientInput) => updateClient(clientId, input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: clientsKeys.detail(clientId) });
            queryClient.invalidateQueries({ queryKey: clientsKeys.all });
        },
    });
}

export function useDeleteClient(clientId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => deleteClient(clientId),
        onSuccess: () => {
            queryClient.removeQueries({ queryKey: clientsKeys.detail(clientId) });
            queryClient.invalidateQueries({ queryKey: clientsKeys.all });
            queryClient.invalidateQueries({ queryKey: ["task-customers"] });
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
        },
    });
}
