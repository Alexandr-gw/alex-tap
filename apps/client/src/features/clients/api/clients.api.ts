import { api } from "@/lib/api/apiClient";
import type {
    ClientDetailsDto,
    ClientsListParams,
    ClientsListResponse,
    CreateClientInput,
    UpdateClientInput,
} from "./clients.types";

export function getClients(params: ClientsListParams): Promise<ClientsListResponse> {
    const searchParams = new URLSearchParams();

    if (params.search?.trim()) {
        searchParams.set("search", params.search.trim());
    }

    searchParams.set("page", String(params.page ?? 1));
    searchParams.set("limit", String(params.limit ?? 20));

    return api<ClientsListResponse>(`/api/v1/clients?${searchParams.toString()}`);
}

export function getClientById(clientId: string): Promise<ClientDetailsDto> {
    return api<ClientDetailsDto>(`/api/v1/clients/${clientId}`);
}

export function createClient(input: CreateClientInput): Promise<ClientDetailsDto> {
    return api<ClientDetailsDto, CreateClientInput>("/api/v1/clients", {
        method: "POST",
        body: input,
    });
}

export function updateClient(
    clientId: string,
    input: UpdateClientInput,
): Promise<ClientDetailsDto> {
    return api<ClientDetailsDto, UpdateClientInput>(`/api/v1/clients/${clientId}`, {
        method: "PATCH",
        body: input,
    });
}

export function deleteClient(clientId: string): Promise<{ ok: true }> {
    return api<{ ok: true }>(`/api/v1/clients/${clientId}`, {
        method: "DELETE",
    });
}
