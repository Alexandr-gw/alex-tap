import { api } from "@/lib/api/apiClient";
import type { JobClientListResponse } from "./job-clients.types";

export function listJobClients(search?: string) {
    const params = new URLSearchParams();
    params.set("take", "10");
    if (search?.trim()) {
        params.set("search", search.trim());
    }

    return api<JobClientListResponse>(`/api/v1/clients?${params.toString()}`);
}
