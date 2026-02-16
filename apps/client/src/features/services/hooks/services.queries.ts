// src/features/services/hooks/services.queries.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { servicesApi } from "../api/services.api";
import type { ServiceCreateInput, ServicesListParams, ServiceUpdateInput } from "../api/services.types";

export function servicesKeys() {
    return {
        all: ["services"] as const,
        list: (params: ServicesListParams) => ["services", "list", params] as const,
        one: (id: string) => ["services", "one", id] as const,
    };
}

export function useServices(params: ServicesListParams) {
    return useQuery({
        queryKey: servicesKeys().list(params),
        queryFn: () => servicesApi.list(params),
        staleTime: 10_000,
    });
}

export function useService(id: string) {
    return useQuery({
        queryKey: servicesKeys().one(id),
        queryFn: () => servicesApi.getOne(id),
        enabled: !!id,
    });
}

export function useCreateService() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: ServiceCreateInput) => servicesApi.create(payload),
        onSuccess: () => qc.invalidateQueries({ queryKey: servicesKeys().all }),
    });
}

export function useUpdateService() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, patch }: { id: string; patch: ServiceUpdateInput }) =>
            servicesApi.update(id, patch),
        onSuccess: async (_, vars) => {
            await Promise.all([
                qc.invalidateQueries({ queryKey: servicesKeys().all }),
                qc.invalidateQueries({ queryKey: servicesKeys().one(vars.id) }),
            ]);
        },
    });
}
