import { api } from "@/lib/api/apiClient";
import type {
    CompanySettingsDto,
    CreateWorkerInput,
    UpdateCompanySettingsInput,
    UpdateWorkerInput,
    WorkersListParams,
    WorkersListResponse,
} from "./settings.types";

export function getCompanySettings(): Promise<CompanySettingsDto> {
    return api<CompanySettingsDto>("/api/v1/settings/company");
}

export function updateCompanySettings(
    input: UpdateCompanySettingsInput,
): Promise<CompanySettingsDto> {
    return api<CompanySettingsDto, UpdateCompanySettingsInput>("/api/v1/settings/company", {
        method: "PATCH",
        body: input,
    });
}

export function getWorkers(params: WorkersListParams): Promise<WorkersListResponse> {
    const searchParams = new URLSearchParams();

    if (params.search?.trim()) {
        searchParams.set("search", params.search.trim());
    }

    searchParams.set("page", String(params.page ?? 1));
    searchParams.set("limit", String(params.limit ?? 20));

    return api<WorkersListResponse>(`/api/v1/settings/workers?${searchParams.toString()}`);
}

export function createWorker(input: CreateWorkerInput): Promise<void> {
    return api<void, CreateWorkerInput>("/api/v1/settings/workers", {
        method: "POST",
        body: input,
    });
}

export function updateWorker(workerId: string, input: UpdateWorkerInput): Promise<void> {
    return api<void, UpdateWorkerInput>(`/api/v1/settings/workers/${workerId}`, {
        method: "PATCH",
        body: input,
    });
}
