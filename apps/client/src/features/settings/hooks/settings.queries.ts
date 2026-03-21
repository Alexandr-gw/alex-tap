import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    createWorker,
    getCompanySettings,
    getWorkers,
    updateCompanySettings,
    updateWorker,
} from "../api/settings.api";
import type {
    CreateWorkerInput,
    UpdateCompanySettingsInput,
    UpdateWorkerInput,
    WorkersListParams,
} from "../api/settings.types";

export const settingsKeys = {
    all: ["settings"] as const,
    company: () => ["settings", "company"] as const,
    workers: (params: WorkersListParams) => ["settings", "workers", params] as const,
};

export function useCompanySettings() {
    return useQuery({
        queryKey: settingsKeys.company(),
        queryFn: getCompanySettings,
    });
}

export function useUpdateCompanySettings() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: UpdateCompanySettingsInput) => updateCompanySettings(input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: settingsKeys.company() });
        },
    });
}

export function useWorkers(params: WorkersListParams) {
    return useQuery({
        queryKey: settingsKeys.workers(params),
        queryFn: () => getWorkers(params),
        placeholderData: (previousData) => previousData,
    });
}

export function useCreateWorker() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: CreateWorkerInput) => createWorker(input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: settingsKeys.all });
        },
    });
}

export function useUpdateWorker(workerId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: UpdateWorkerInput) => updateWorker(workerId, input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: settingsKeys.all });
        },
    });
}
