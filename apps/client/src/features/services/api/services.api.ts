// src/features/services/api/services.api.ts
import { api } from "@/lib/api/apiClient.ts";
import type {
    ServiceCreateInput,
    ServiceDto,
    ServicesListParams,
    ServicesListResponse,
    ServiceUpdateInput,
} from "./services.types";

function qs(params: Record<string, any>) {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v === undefined || v === null || v === "") return;
        sp.set(k, String(v));
    });
    const s = sp.toString();
    return s ? `?${s}` : "";
}

const BASE = "/api/v1/services";

export const servicesApi = {
    list(params: ServicesListParams) {
        return api<ServicesListResponse>(`${BASE}${qs(params)}`);
    },

    getOne(id: string) {
        return api<ServiceDto>(`${BASE}/${id}`);
    },

    create(payload: ServiceCreateInput) {
        return api<ServiceDto, ServiceCreateInput>(BASE, {
            method: "POST",
            body: payload,
        });
    },

    update(id: string, payload: ServiceUpdateInput) {
        return api<ServiceDto, ServiceUpdateInput>(`${BASE}/${id}`, {
            method: "PATCH",
            body: payload,
        });
    },
};

