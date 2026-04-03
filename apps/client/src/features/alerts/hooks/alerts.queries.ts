import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { alertsApi } from "@/features/alerts/api/alerts.api";
import type { ReviewJobInput } from "@/features/alerts/api/alerts.types";

export function alertsKeys() {
    return {
        all: ["alerts"] as const,
        unread: ["alerts", "unread"] as const,
        list: (status: "OPEN" | "RESOLVED") => ["alerts", "list", status] as const,
        detail: (id: string) => ["alerts", "detail", id] as const,
    };
}

export function useAlertsUnreadCount(enabled = true) {
    return useQuery({
        queryKey: alertsKeys().unread,
        queryFn: () => alertsApi.unreadCount(),
        enabled,
        staleTime: 5_000,
        refetchInterval: enabled ? 15_000 : false,
    });
}

export function useAlertsList(status: "OPEN" | "RESOLVED" = "OPEN", enabled = true) {
    return useQuery({
        queryKey: alertsKeys().list(status),
        queryFn: () => alertsApi.list(status),
        enabled,
        staleTime: 5_000,
        refetchInterval: enabled ? 15_000 : false,
    });
}

export function useAlertDetail(id: string, enabled = true) {
    return useQuery({
        queryKey: alertsKeys().detail(id),
        queryFn: () => alertsApi.getOne(id),
        enabled: enabled && !!id,
        staleTime: 5_000,
        refetchInterval: enabled && !!id ? 15_000 : false,
    });
}

export function useMarkAlertRead() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => alertsApi.markRead(id),
        onSuccess: async (_, alertId) => {
            await Promise.all([
                qc.invalidateQueries({ queryKey: alertsKeys().all }),
                qc.invalidateQueries({ queryKey: alertsKeys().detail(alertId) }),
            ]);
        },
    });
}

export function useReviewJob() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ jobId, payload }: { jobId: string; payload: ReviewJobInput }) =>
            alertsApi.reviewJob(jobId, payload),
        onSuccess: async (_, vars) => {
            await Promise.all([
                qc.invalidateQueries({ queryKey: alertsKeys().all }),
                qc.invalidateQueries({ queryKey: alertsKeys().detail(vars.payload.alertId ?? "") }),
            ]);
        },
    });
}
